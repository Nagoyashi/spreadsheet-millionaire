from flask import Blueprint, request, jsonify, session
from marshmallow import ValidationError

from app import limiter
from models.user import User
from schemas.user_schema import RegisterSchema, LoginSchema
from services.email import send_welcome_email
from utils.auth_helpers import (
    set_session, clear_session, get_current_user,
    csrf_protect, generate_csrf_token, login_required,
)

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

register_schema = RegisterSchema()
login_schema    = LoginSchema()


@bp.route("/csrf-token", methods=["GET"])
def csrf_token():
    """
    Issues a CSRF token for the current session.
    Stored server-side in the session, returned in JSON body.
    Frontend stores in memory and sends as X-CSRF-Token header.
    """
    token = generate_csrf_token()
    return jsonify({"csrf_token": token}), 200


@bp.route("/register", methods=["POST"])
@limiter.limit("10 per hour")
@csrf_protect
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

    # Best-effort welcome email — the user row is already committed, so an email
    # failure must never fail or materially slow registration. send_welcome_email
    # already swallows its own errors; the extra guard keeps the response path
    # bulletproof regardless of what the SDK does.
    try:
        send_welcome_email(user.email)
    except Exception:
        pass

    return jsonify({"user": user.to_dict()}), 201


@bp.route("/login", methods=["POST"])
@limiter.limit("20 per hour; 5 per minute")
@csrf_protect
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

    # Deliberate vague message — don't reveal whether email exists
    if not user or not user.check_password(data["password"]):
        return jsonify({"error": "Invalid email or password."}), 401

    set_session(user)
    return jsonify({"user": user.to_dict()}), 200


@bp.route("/logout", methods=["POST"])
@csrf_protect
def logout():
    """Clear the session. Always returns 200."""
    clear_session()
    return jsonify({"message": "Logged out."}), 200


@bp.route("/account", methods=["DELETE"])
@login_required
@csrf_protect
@limiter.limit("5 per hour")
def delete_account():
    """
    Permanently delete the authenticated user's account and all their data.
    Body: { password } — required to confirm intent.

    Password re-verification prevents accidental deletion if a session is
    left open on a shared machine, and satisfies GDPR Article 17 (right
    to erasure) by ensuring the deletion is intentional.

    ON DELETE CASCADE on saved_calculators handles data cleanup automatically.
    """
    user_id  = session["user_id"]
    body     = request.get_json(silent=True) or {}
    password = body.get("password", "")

    if not password:
        return jsonify({"error": "Password is required to delete your account."}), 422

    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found."}), 404

    if not user.check_password(password):
        return jsonify({"error": "Incorrect password."}), 401

    User.delete(user_id)
    clear_session()

    return jsonify({"message": "Account deleted."}), 200


@bp.route("/status", methods=["GET"])
def status():
    """
    Lightweight session check on every app load.
    GET — no CSRF protection needed (read-only).
    """
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"logged_in": False, "user": None}), 200

    user = get_current_user()
    if not user:
        clear_session()
        return jsonify({"logged_in": False, "user": None}), 200

    return jsonify({"logged_in": True, "user": user.to_dict()}), 200
