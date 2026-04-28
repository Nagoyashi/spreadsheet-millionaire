from marshmallow import Schema, fields, validate, ValidationError

VALID_CALC_TYPES = [
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
]

class SaveCalculatorSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    calc_type = fields.Str(
        required=True,
        validate=validate.OneOf(VALID_CALC_TYPES)
    )
    data = fields.Dict(required=True)

class UpdateCalculatorSchema(Schema):
    name = fields.Str(validate=validate.Length(min=1, max=100))
    data = fields.Dict()
