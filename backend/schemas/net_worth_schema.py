"""
schemas/net_worth_schema.py
---------------------------
Marshmallow schemas for the Net Worth tracker resources.

Enum validation (asset_type / liability_type / asset_class / property_type)
draws on net_worth_types.py — the same single source of truth the db_init.py
CHECK constraints use, so the API and the database can never disagree on the
allowed values.

One schema per resource; PUT routes load with partial=True to allow partial
updates (so `required=True` fields become optional on update).
"""

from marshmallow import Schema, fields, validate

from net_worth_types import (
    ASSET_TYPES,
    LIABILITY_TYPES,
    ASSET_CLASSES,
    PROPERTY_TYPES,
)

# Money / rate / quantity bounds. NUMERIC(14,2) caps money well below this.
_MONEY = dict(validate=validate.Range(min=0), places=2)
_NAME = dict(validate=validate.Length(min=1, max=100))
_NOTES = dict(validate=validate.Length(max=1000), allow_none=True, load_default=None)


class AssetSchema(Schema):
    asset_type = fields.Str(required=True, validate=validate.OneOf(ASSET_TYPES))
    name = fields.Str(required=True, **_NAME)
    current_value = fields.Decimal(required=True, **_MONEY)
    cost_basis = fields.Decimal(load_default=0, **_MONEY)
    notes = fields.Str(**_NOTES)


class LiabilitySchema(Schema):
    liability_type = fields.Str(required=True, validate=validate.OneOf(LIABILITY_TYPES))
    name = fields.Str(required=True, **_NAME)
    current_balance = fields.Decimal(required=True, **_MONEY)
    interest_rate = fields.Decimal(load_default=0, validate=validate.Range(min=0), places=3)
    minimum_payment = fields.Decimal(load_default=0, **_MONEY)
    due_date = fields.Date(allow_none=True, load_default=None)
    notes = fields.Str(**_NOTES)


class InvestmentSchema(Schema):
    ticker = fields.Str(required=True, validate=validate.Length(min=1, max=20))
    quantity = fields.Decimal(required=True, validate=validate.Range(min=0, min_inclusive=False))
    cost_basis = fields.Decimal(required=True, **_MONEY)
    current_value = fields.Decimal(load_default=0, **_MONEY)
    asset_class = fields.Str(required=True, validate=validate.OneOf(ASSET_CLASSES))
    region = fields.Str(validate=validate.Length(max=100), allow_none=True, load_default=None)
    purchase_date = fields.Date(allow_none=True, load_default=None)
    notes = fields.Str(**_NOTES)


class RealEstateSchema(Schema):
    property_name = fields.Str(required=True, **_NAME)
    property_type = fields.Str(required=True, validate=validate.OneOf(PROPERTY_TYPES))
    current_value = fields.Decimal(required=True, **_MONEY)
    purchase_price = fields.Decimal(load_default=0, **_MONEY)
    purchase_date = fields.Date(allow_none=True, load_default=None)
    mortgage_balance = fields.Decimal(load_default=0, **_MONEY)
    mortgage_interest_rate = fields.Decimal(load_default=0, validate=validate.Range(min=0), places=3)
    mortgage_payment = fields.Decimal(load_default=0, **_MONEY)
    mortgage_term_years = fields.Int(validate=validate.Range(min=0), allow_none=True, load_default=None)
    monthly_rent = fields.Decimal(load_default=0, **_MONEY)
    address = fields.Str(validate=validate.Length(max=300), allow_none=True, load_default=None)
    notes = fields.Str(**_NOTES)


class SnapshotSchema(Schema):
    """POST /snapshots — totals are computed server-side from the current
    summary, so the client only optionally supplies a date + notes."""
    snapshot_date = fields.Date(allow_none=True, load_default=None)
    notes = fields.Str(**_NOTES)
