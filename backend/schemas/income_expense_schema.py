"""
schemas/income_expense_schema.py
--------------------------------
Marshmallow schema for Income & Expense transactions.

Enums draw on income_expense_types.py (the same source as the db_init CHECKs).
The DB CHECK accepts the income∪expense category union; this schema additionally
validates that the category matches the transaction's type (per-type), when both
are present (PUT may send a partial body).
"""

from marshmallow import Schema, fields, validate, validates_schema, ValidationError

from income_expense_types import (
    TRANSACTION_TYPES,
    ALL_CATEGORIES,
    EXPENSE_CATEGORIES,
    INCOME_CATEGORIES,
)


class TransactionSchema(Schema):
    type = fields.Str(required=True, validate=validate.OneOf(TRANSACTION_TYPES))
    category = fields.Str(required=True, validate=validate.OneOf(ALL_CATEGORIES))
    amount = fields.Decimal(
        required=True, places=2, validate=validate.Range(min=0, min_inclusive=False)
    )
    occurred_on = fields.Date(required=True)
    note = fields.Str(validate=validate.Length(max=1000), allow_none=True, load_default=None)

    @validates_schema
    def _category_matches_type(self, data, **kwargs):
        t, c = data.get("type"), data.get("category")
        if t and c:
            valid = EXPENSE_CATEGORIES if t == "expense" else INCOME_CATEGORIES
            if c not in valid:
                raise ValidationError(
                    f"'{c}' is not a valid {t} category.", field_name="category"
                )
