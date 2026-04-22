from marshmallow import Schema, fields, validate, validates, ValidationError

VALID_CALC_TYPES = ("fire", "compound", "sankey")


class SaveCalculatorSchema(Schema):
    name = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=100, error="Name must be between 1 and 100 characters."),
        error_messages={"required": "A name for this calculation is required."},
    )
    calc_type = fields.Str(
        required=True,
        validate=validate.OneOf(VALID_CALC_TYPES, error="calc_type must be one of: fire, compound, sankey."),
        error_messages={"required": "calc_type is required."},
    )
    data = fields.Dict(
        required=True,
        error_messages={"required": "Calculator data is required."},
    )

    @validates("data")
    def validate_data(self, value: dict):
        if not value:
            raise ValidationError("Calculator data cannot be empty.")


class UpdateCalculatorSchema(Schema):
    """Both fields are optional — allows renaming without re-sending data."""
    name = fields.Str(
        validate=validate.Length(min=1, max=100, error="Name must be between 1 and 100 characters."),
    )
    data = fields.Dict()

    @validates("data")
    def validate_data(self, value: dict):
        if value is not None and not value:
            raise ValidationError("Calculator data cannot be empty.")
