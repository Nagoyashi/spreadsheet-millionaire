from marshmallow import Schema, fields, validate

from calc_types import VALID_CALC_TYPES


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
