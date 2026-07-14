"""
schemas/income_expense_schema.py
--------------------------------
Marshmallow schema for Income & Expense transactions.

Enums draw on income_expense_types.py (the same source as the db_init CHECKs).
The DB CHECK accepts the income∪expense category union; this schema additionally
validates that the category matches the transaction's type (per-type), when both
are present (PUT may send a partial body).
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
    ALL_CATEGORIES,
    EXPENSE_CATEGORIES,
    INCOME_CATEGORIES,
    RECURRENCE_UNITS,
)


def _check_category_matches_type(data):
    """Per-type category validation shared by the transaction + grid-cell schemas."""
    t, c = data.get("type"), data.get("category")
    if t and c:
        valid = EXPENSE_CATEGORIES if t == "expense" else INCOME_CATEGORIES
        if c not in valid:
            raise ValidationError(f"'{c}' is not a valid {t} category.", field_name="category")


class TransactionSchema(Schema):
    type = fields.Str(required=True, validate=validate.OneOf(TRANSACTION_TYPES))
    category = fields.Str(required=True, validate=validate.OneOf(ALL_CATEGORIES))
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

    @validates_schema
    def _category_matches_type(self, data, **kwargs):
        _check_category_matches_type(data)

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
    category = fields.Str(required=True, validate=validate.OneOf(ALL_CATEGORIES))
    amount = fields.Decimal(
        required=True, places=2, validate=validate.Range(min=0, min_inclusive=False)
    )

    @validates_schema
    def _category_matches_type(self, data, **kwargs):
        _check_category_matches_type(data)


# Every (type, category) combo at most once — the hard ceiling on a grid payload.
_MAX_GRID_CELLS = len(EXPENSE_CATEGORIES) + len(INCOME_CATEGORIES)


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
