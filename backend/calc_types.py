"""
calc_types.py
-------------
Single source of truth for the set of valid calculator types.

Both schemas/calculator_schema.py and db_init.py import VALID_CALC_TYPES
from this module. When you add a new calculator, this is the only Python
file you need to edit.

Adding a new calculator (full checklist):
    1. Create the React component in frontend/src/calculators/YourCalc.jsx
    2. Add an entry to frontend/src/calculators/registry.js
    3. Add the type string to VALID_CALC_TYPES below
    4. Run `python db_init.py` to migrate the CHECK constraint
"""

# Order matters only for readability — the backend treats this as a set.
VALID_CALC_TYPES = (
    'fire',
    'compound',
    'sankey',
    'investment_fee',
    'inflation',
    'dividend',
    'withdrawal',
    'debt_payoff',
    'mortgage',
    'coast_fire',
    'emergency_fund',
    'barista_fire',
)

# Default published set — the public MVP four. This SEEDS the runtime publish
# state (the calculator_publish table in db_init.py); after seeding, the DB is
# the source of truth and the admin portal toggles it live. It mirrors the
# `published: true` entries in frontend/src/calculators/registry.js at launch —
# the same four (FIRE, Compound Interest, Debt Payoff, Emergency Fund).
# See DECISIONS.md § "Runtime publish state — DB-backed, admin-toggleable".
DEFAULT_PUBLISHED_TYPES = (
    'fire',
    'compound',
    'debt_payoff',
    'emergency_fund',
)
