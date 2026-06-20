"""
net_worth_types.py
------------------
Single source of truth for the Net Worth tracker's enum value sets.

Both schemas/net_worth_schema.py (Marshmallow OneOf) and db_init.py (CHECK
constraints on the nw_* tables) import these tuples. When a value set changes,
this is the only Python file to edit — then run `python db_init.py` to rebuild
the affected CHECK constraint in place (same drop-and-recreate pattern as
calc_types / VALID_CALC_TYPES).

See DECISIONS.md § "Net Worth Tracker" for the data model these enums back.
"""

# nw_assets.asset_type — 'custom' surfaces in the UI as "Collectibles".
ASSET_TYPES = (
    'cash',
    'brokerage',
    'crypto',
    'pension',
    'custom',
)

# nw_liabilities.liability_type — mortgages live on nw_real_estate, not here,
# so they are intentionally absent from this set.
LIABILITY_TYPES = (
    'credit_card',
    'loan',
    'other',
)

# nw_investment_holdings.asset_class
ASSET_CLASSES = (
    'stock',
    'etf',
    'crypto',
    'bond',
    'other',
)

# nw_real_estate.property_type
PROPERTY_TYPES = (
    'primary',
    'rental',
    'investment',
    'vacation',
)
