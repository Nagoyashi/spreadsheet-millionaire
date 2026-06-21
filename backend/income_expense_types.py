"""
income_expense_types.py
-----------------------
Single source of truth for the Income & Expense tracker's enum value sets.

Both schemas/income_expense_schema.py (Marshmallow OneOf) and db_init.py (CHECK
constraints on ie_transactions) import these. Edit here, then run
`python db_init.py` to rebuild the affected CHECK in place — same drop-and-
recreate pattern as calc_types / net_worth_types.

See DECISIONS.md § "Income & Expense Tracker" for the data model these back.
"""

# ie_transactions.type — sign is carried by the type, not the amount (amount > 0).
TRANSACTION_TYPES = (
    "income",
    "expense",
)

# Categories are curated (not free-text) so the by-category breakdown aggregates
# cleanly. They are type-specific in the UI; the DB CHECK accepts the union and
# the schema validates per-type.
EXPENSE_CATEGORIES = (
    "housing",
    "food",
    "transport",
    "utilities",
    "health",
    "entertainment",
    "shopping",
    "savings",
    "other",
)

INCOME_CATEGORIES = (
    "salary",
    "freelance",
    "investment",
    "gift",
    "refund",
    "other",
)

# Union for the DB CHECK constraint — dedup while preserving order ('other'
# appears in both).
ALL_CATEGORIES = tuple(dict.fromkeys(EXPENSE_CATEGORIES + INCOME_CATEGORIES))
