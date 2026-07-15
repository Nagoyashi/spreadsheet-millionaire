"""
schemas/income_expense_schema.py
--------------------------------
Marshmallow schemas for Income & Expense transactions, the monthly grid, and
user-scoped categories.

Enums draw on income_expense_types.py (the same source as the db_init CHECKs).
Since v0.15.1 categories are user-scoped (ie_categories) — the schemas bound
the category string's shape only; per-user validity (does this key exist,
active, for this type?) is checked at the model layer by the routes, because a
static schema can't see the user's category set.
"""

from marshmallow import (
    Schema,
    fields,
    validate,
    validates_schema,
    post_load,
    ValidationError,
)

from income_expense_types import (
    TRANSACTION_TYPES,
    RECURRENCE_UNITS,
    CATEGORY_NAME_MAX,
)

_category_field = lambda: fields.Str(  # noqa: E731 — one shared field shape
    required=True, validate=validate.Length(min=1, max=CATEGORY_NAME_MAX)
)


class TransactionSchema(Schema):
    type = fields.Str(required=True, validate=validate.OneOf(TRANSACTION_TYPES))
    category = _category_field()
    amount = fields.Decimal(
        required=True, places=2, validate=validate.Range(min=0, min_inclusive=False)
    )
    occurred_on = fields.Date(required=True)
    note = fields.Str(validate=validate.Length(max=1000), allow_none=True, load_default=None)

    # Recurrence: (unit, interval) — 'none' is a one-off. Interval is bounded to a
    # sane range; a daily recurrence projected over a year is already 365 points.
    recurrence_unit = fields.Str(
        validate=validate.OneOf(RECURRENCE_UNITS), load_default="none"
    )
    recurrence_interval = fields.Int(
        validate=validate.Range(min=1, max=366), load_default=1
    )

    @post_load
    def _normalise_recurrence(self, data, **kwargs):
        # A non-repeating transaction always stores interval 1 — keeps the data
        # tidy regardless of what interval the client happened to send. Guard on
        # the key being PRESENT so a partial PUT (which omits load_defaults) can't
        # silently reset a recurring row's interval on an unrelated edit.
        if data.get("recurrence_unit") == "none":
            data["recurrence_interval"] = 1
        return data


class MonthCellSchema(Schema):
    """One monthly-grid cell: a per-(type, category) sum for the month being PUT.

    No occurred_on (the URL's year/month decides it — always first of month), no
    note/recurrence (aggregate rows are one-offs), and no source (server-set;
    unknown fields raise). See DECISIONS.md § "Income & Expense Tracker"
    (Monthly grid bulk entry).
    """

    type = fields.Str(required=True, validate=validate.OneOf(TRANSACTION_TYPES))
    category = _category_field()
    amount = fields.Decimal(
        required=True, places=2, validate=validate.Range(min=0, min_inclusive=False)
    )


# With user-scoped categories the combo count is per-user, so the payload cap is
# a generous fixed bound rather than the default-set size.
_MAX_GRID_CELLS = 200


class MonthGridSchema(Schema):
    """The month PUT body: the full set of non-empty cells for one month.

    A cleared/empty cell is simply absent (the PUT replaces the month's monthly
    rows wholesale). Duplicate (type, category) cells are rejected — the payload
    must be a grid, not a transaction stream.
    """

    cells = fields.List(
        fields.Nested(MonthCellSchema),
        required=True,
        validate=validate.Length(max=_MAX_GRID_CELLS),
    )

    @validates_schema
    def _no_duplicate_cells(self, data, **kwargs):
        seen = set()
        for cell in data.get("cells") or []:
            key = (cell.get("type"), cell.get("category"))
            if key in seen:
                raise ValidationError(
                    f"Duplicate cell for {key[0]}/{key[1]}.", field_name="cells"
                )
            seen.add(key)


class CategorySchema(Schema):
    """POST /categories — add (or restore, on an archived name match) a
    user-scoped category. The key is server-generated; archived state is
    managed via PATCH, so neither is accepted here (unknown fields raise)."""

    type = fields.Str(required=True, validate=validate.OneOf(TRANSACTION_TYPES))
    name = fields.Str(
        required=True, validate=validate.Length(min=1, max=CATEGORY_NAME_MAX)
    )

    @post_load
    def _strip_name(self, data, **kwargs):
        data["name"] = data["name"].strip()
        if not data["name"]:
            raise ValidationError("Name must not be blank.", field_name="name")
        return data


class CategoryPatchSchema(Schema):
    """PATCH /categories/<id> — archive (soft delete), restore, and/or rename.
    The key never changes on rename (transaction rows keep resolving)."""

    archived = fields.Bool()
    name = fields.Str(validate=validate.Length(min=1, max=CATEGORY_NAME_MAX))

    @validates_schema
    def _at_least_one(self, data, **kwargs):
        if not data:
            raise ValidationError("Nothing to update.")

    @post_load
    def _strip_name(self, data, **kwargs):
        if "name" in data:
            data["name"] = data["name"].strip()
            if not data["name"]:
                raise ValidationError("Name must not be blank.", field_name="name")
        return data


class CategoryOrderSchema(Schema):
    """PUT /categories/order — the full desired order of one type's categories."""

    type = fields.Str(required=True, validate=validate.OneOf(TRANSACTION_TYPES))
    ids = fields.List(
        fields.Int(), required=True, validate=validate.Length(min=1, max=200)
    )
