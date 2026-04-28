from flask import Blueprint, request, jsonify, session
from marshmallow import ValidationError

from app import limiter
from models.user import User
from schemas.user_schema import RegisterSchema, LoginSchema
from utils.auth_helpers import set_session, clear_session, get_current_user

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

register_schema = RegisterSchema()
login_schema    = LoginSchema()


@bp.route("/register", methods=["POST"])
@limiter.limit("10 per hour")   # prevent mass account creation from one IP
def register():
    """
    Create a new account.
    Body: { email, password }
    Returns 201 + user object on success.
    """
    if session.get("user_id"):
        return jsonify({"error": "Already logged in."}), 400

    try:
        data = register_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422

    try:
        user = User.create(email=data["email"], plain_password=data["password"])
    except ValueError as err:
        return jsonify({"error": str(err)}), 409

    set_session(user)
    return jsonify({"user": user.to_dict()}), 201


@bp.route("/login", methods=["POST"])
@limiter.limit("20 per hour; 5 per minute")   # brute-force protection
def login():
    """
    Authenticate an existing user.
    Body: { email, password }
    Returns 200 + user object on success.
    """
    if session.get("user_id"):
        return jsonify({"error": "Already logged in."}), 400

    try:
        data = login_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422

    user = User.get_by_email(data["email"])

    # Deliberate vague message — don't reveal whether the email exists
    if not user or not user.check_password(data["password"]):
        return jsonify({"error": "Invalid email or password."}), 401

    set_session(user)
    return jsonify({"user": user.to_dict()}), 200


@bp.route("/logout", methods=["POST"])
def logout():
    """Clear the session. Always returns 200."""
    clear_session()
    return jsonify({"message": "Logged out."}), 200


@bp.route("/status", methods=["GET"])
def status():
    """
    Lightweight session check called on every app load.
    Returns auth state without touching the DB if not logged in.
    """
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"logged_in": False, "user": None}), 200

    user = get_current_user()
    if not user:
        clear_session()
        return jsonify({"logged_in": False, "user": None}), 200

    return jsonify({"logged_in": True, "user": user.to_dict()}), 200
