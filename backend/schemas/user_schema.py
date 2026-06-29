import re
from marshmallow import Schema, fields, validate, validates, ValidationError

MIN_PASSWORD_LENGTH = 8
# bcrypt silently truncates anything past 72 bytes (models/user.py). Cap here so
# a long password is rejected with a clear 422 instead of being quietly cut — and
# so an arbitrarily large password string can't be passed through. Checked in
# bytes because that's what bcrypt counts (multibyte chars cost >1 byte each).
MAX_PASSWORD_BYTES = 72
EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def validate_password(value: str):
    """
    Single source of the password strength rule (8–72 bytes, 1 letter, 1 number).
    Every schema that accepts a new password reuses this — never redefine it.
    """
    if len(value) < MIN_PASSWORD_LENGTH:
        raise ValidationError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")
    if len(value.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise ValidationError(f"Password must be at most {MAX_PASSWORD_BYTES} characters.")
    if not any(c.isdigit() for c in value):
        raise ValidationError("Password must contain at least one number.")
    if not any(c.isalpha() for c in value):
        raise ValidationError("Password must contain at least one letter.")


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
    def _validate_password(self, value: str):
        validate_password(value)


class LoginSchema(Schema):
    email = fields.Email(
        required=True,
        error_messages={"required": "Email is required.", "invalid": "Enter a valid email address."},
    )
    password = fields.Str(
        required=True,
        error_messages={"required": "Password is required."},
    )


class ResetPasswordSchema(Schema):
    """
    New password for the reset flow. The token is NOT a schema field — the route
    validates it first (token-first ordering) so a dead link yields a generic
    400 without ever touching the password rules.
    """
    password = fields.Str(
        required=True,
        error_messages={"required": "Password is required."},
    )

    @validates("password")
    def _validate_password(self, value: str):
        validate_password(value)


class ChangePasswordSchema(Schema):
    """Authenticated password change. Current password verified in the route."""
    current_password = fields.Str(
        required=True,
        error_messages={"required": "Current password is required."},
    )
    new_password = fields.Str(
        required=True,
        error_messages={"required": "New password is required."},
    )

    @validates("new_password")
    def _validate_new_password(self, value: str):
        validate_password(value)


class ChangeEmailSchema(Schema):
    """Authenticated email change. Password re-confirmation verified in the route."""
    password = fields.Str(
        required=True,
        error_messages={"required": "Password is required."},
    )
    new_email = fields.Email(
        required=True,
        error_messages={"required": "Email is required.", "invalid": "Enter a valid email address."},
    )
