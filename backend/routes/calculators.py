from flask import Blueprint, request, jsonify, session
from marshmallow import ValidationError

from models.calculator import SavedCalculator
from schemas.calculator_schema import SaveCalculatorSchema, UpdateCalculatorSchema
from utils.auth_helpers import login_required, csrf_protect

bp = Blueprint("calculators", __name__, url_prefix="/api/calculators")

save_schema   = SaveCalculatorSchema()
update_schema = UpdateCalculatorSchema()


@bp.route("", methods=["GET"])
@login_required
def list_calculators():
    """
    Return all saved calculations for the logged-in user.
    Optional query param: ?type=fire (filter by calc_type)
    GET — no CSRF protection needed (read-only).
    """
    user_id     = session["user_id"]
    type_filter = request.args.get("type")

    calcs = SavedCalculator.get_all_for_user(user_id)

    if type_filter:
        calcs = [c for c in calcs if c.calc_type == type_filter]

    return jsonify({"calculators": [c.to_dict() for c in calcs]}), 200


@bp.route("", methods=["POST"])
@login_required
@csrf_protect
def save_calculator():
    """
    Save a new calculation.
    Body: { name, calc_type, data }
    """
    user_id = session["user_id"]

    try:
        payload = save_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422

    calc = SavedCalculator.create(
        user_id   = user_id,
        name      = payload["name"],
        calc_type = payload["calc_type"],
        data      = payload["data"],
    )

    return jsonify({"calculator": calc.to_dict()}), 201


@bp.route("/<int:calc_id>", methods=["PUT"])
@login_required
@csrf_protect
def update_calculator(calc_id: int):
    """
    Update the name and/or data of a saved calculation.
    Body: { name?, data? } — both fields are optional.
    """
    user_id = session["user_id"]

    try:
        payload = update_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422

    if not payload:
        return jsonify({"error": "Nothing to update."}), 400

    calc = SavedCalculator.update(
        calc_id = calc_id,
        user_id = user_id,
        name    = payload.get("name"),
        data    = payload.get("data"),
    )

    if not calc:
        return jsonify({"error": "Calculation not found."}), 404

    return jsonify({"calculator": calc.to_dict()}), 200


@bp.route("/<int:calc_id>", methods=["DELETE"])
@login_required
@csrf_protect
def delete_calculator(calc_id: int):
    """Delete a saved calculation. Returns 204 on success."""
    user_id = session["user_id"]
    deleted = SavedCalculator.delete(calc_id, user_id)

    if not deleted:
        return jsonify({"error": "Calculation not found."}), 404

    return "", 204
