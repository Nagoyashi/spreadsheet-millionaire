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

# Categories are user-scoped and customizable since v0.15.1 (the ie_categories
# table: add / archive / restore, per-user). The sets below are now the DEFAULT
# seed a new user starts from — (key, display name) pairs whose keys equal the
# pre-v0.15.1 curated slugs, so every historical ie_transactions.category value
# resolves against a seeded row. Category validity is checked against the
# user's active ie_categories rows at write time (model layer), not by a DB
# CHECK or schema OneOf. See DECISIONS.md § "Income & Expense Tracker"
# (Custom categories).
DEFAULT_EXPENSE_CATEGORIES = (
    ("housing", "Housing"),
    ("food", "Food"),
    ("transport", "Transport"),
    ("utilities", "Utilities"),
    ("health", "Health"),
    ("entertainment", "Entertainment"),
    ("shopping", "Shopping"),
    ("savings", "Savings"),
    ("other", "Other"),
)

DEFAULT_INCOME_CATEGORIES = (
    ("salary", "Salary"),
    ("freelance", "Freelance"),
    ("investment", "Investment"),
    ("gift", "Gift"),
    ("refund", "Refund"),
    ("other", "Other"),
)

DEFAULT_CATEGORIES = {
    "expense": DEFAULT_EXPENSE_CATEGORIES,
    "income": DEFAULT_INCOME_CATEGORIES,
}

# Bounds shared by the schema validation and the DB CHECKs on category keys
# and display names (free-form now, but never unbounded).
CATEGORY_NAME_MAX = 60

# ie_transactions.source — which write path created the row. 'manual' = the
# per-transaction form/API; 'monthly' = an aggregate row written by the monthly
# grid (one row per type+category+month, occurred_on = first of month). Future
# import paths (CSV/PDF) add 'import' here when they ship. Server-set only —
# never accepted from a request body. See DECISIONS.md § "Income & Expense
# Tracker" (Monthly grid bulk entry).
TRANSACTION_SOURCES = (
    "manual",
    "monthly",
)

# ie_transactions.recurrence_unit — a transaction can repeat. A repeat is
# expressed as (unit, interval): e.g. ('week', 2) = "every two weeks", ('month', 1)
# = "monthly". 'none' = a one-off (the default for every existing row). Forecast
# occurrences are derived at read time on the client and never persisted (so the
# table never holds projected rows). See DECISIONS.md § "Income & Expense Tracker".
RECURRENCE_UNITS = (
    "none",
    "day",
    "week",
    "month",
    "year",
)
