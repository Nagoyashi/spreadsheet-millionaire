import re
from marshmallow import Schema, fields, validate, validates, ValidationError

MIN_PASSWORD_LENGTH = 8
EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class RegisterSchema(Schema):
    email = fields.Email(
        required=True,
        error_messages={"required": "Email is required.", "invalid": "Enter a valid email address."},
    )
    password = fields.Str(
        required=True,
        error_messages={"required": "Password is required."},
    )

    @validates("password")
    def validate_password(self, value: str):
        if len(value) < MIN_PASSWORD_LENGTH:
            raise ValidationError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")
        if not any(c.isdigit() for c in value):
            raise ValidationError("Password must contain at least one number.")
        if not any(c.isalpha() for c in value):
            raise ValidationError("Password must contain at least one letter.")


class LoginSchema(Schema):
    email = fields.Email(
        required=True,
        error_messages={"required": "Email is required.", "invalid": "Enter a valid email address."},
    )
    password = fields.Str(
        required=True,
        error_messages={"required": "Password is required."},
    )
