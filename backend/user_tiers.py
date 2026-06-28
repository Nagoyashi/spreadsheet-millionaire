"""
user_tiers.py
-------------
Single source of truth for the set of valid account tiers (freemium).

Imported by the admin schema/validation and by db_init.py (the users.tier CHECK
constraint) — the same single-source pattern as calc_types.py. During beta every
account is 'free' and billing is off; Pro/Elite are set manually by an admin
(manual comp) until billing exists.
"""

USER_TIERS = (
    'free',
    'pro',
    'elite',
)

DEFAULT_TIER = 'free'
