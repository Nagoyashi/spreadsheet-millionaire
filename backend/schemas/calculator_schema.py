import json

from marshmallow import Schema, fields, validate, ValidationError

from calc_types import VALID_CALC_TYPES

# Bounds on the opaque `data` blob. Calculator inputs are a few KB of flat
# key/values; these caps are generous but stop an authenticated user from
# bloating JSONB storage or sending pathologically nested payloads.
# MAX_CONTENT_LENGTH (config.py) rejects oversized bodies before parsing with a
# 413; these give a precise 422 on the field itself.
MAX_DATA_BYTES = 64 * 1024
MAX_DATA_DEPTH = 24
MAX_DATA_NODES = 1000


def _bounded_calc_data(value):
    """Validate the saved-calculator `data` dict: JSON-serialisable, under the
    byte cap, and not pathologically wide/deep. Raises ValidationError → 422."""
    try:
        serialized = json.dumps(value)
    except (TypeError, ValueError):
        raise ValidationError("Data must be JSON-serialisable.")
    if len(serialized.encode("utf-8")) > MAX_DATA_BYTES:
        raise ValidationError(f"Data exceeds the {MAX_DATA_BYTES // 1024} KB limit.")

    nodes = 0

    def walk(node, depth):
        nonlocal nodes
        if depth > MAX_DATA_DEPTH:
            raise ValidationError("Data is nested too deeply.")
        if isinstance(node, dict):
            children = node.values()
        elif isinstance(node, list):
            children = node
        else:
            return
        for child in children:
            nodes += 1
            if nodes > MAX_DATA_NODES:
                raise ValidationError("Data has too many fields.")
            walk(child, depth + 1)

    walk(value, 0)


class SaveCalculatorSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    calc_type = fields.Str(
        required=True,
        validate=validate.OneOf(VALID_CALC_TYPES)
    )
    data = fields.Dict(required=True, validate=_bounded_calc_data)


class UpdateCalculatorSchema(Schema):
    name = fields.Str(validate=validate.Length(min=1, max=100))
    data = fields.Dict(validate=_bounded_calc_data)
