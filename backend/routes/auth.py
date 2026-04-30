from flask import Blueprint, request, jsonify, session, make_response
from marshmallow import ValidationError

from app import limiter
from models.user import User
from schemas.user_schema import RegisterSchema, LoginSchema
from utils.auth_helpers import (
    set_session, clear_session, get_current_user,
    csrf_protect, generate_csrf_token,
)

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

register_schema = RegisterSchema()
login_schema    = LoginSchema()


@bp.route("/csrf-token", methods=["GET"])
def csrf_token():
    """
    Issues a CSRF token for the current session.

    Called once on app load before any mutating request.
    The token is stored in the server-side session and returned as:
      - JSON body (for immediate use)
      - Non-HttpOnly cookie (so JS can read and re-attach it as a header)

    A malicious cross-origin page can trigger credentialed requests (the browser
    sends the session cookie automatically) but cannot read our csrf_token cookie
    due to SameSite=Strict + CORS, so it cannot forge the X-CSRF-Token header.
    """
    token = generate_csrf_token()
    response = make_response(jsonify({"csrf_token": token}))
    response.set_cookie(
        "csrf_token",
        token,
        httponly=False,       # JS must be able to read this
        samesite="Strict",    # never sent on cross-site requests
        secure=False,         # set True in prod via Talisman / config
        max_age=60 * 60 * 24, # 24 hours
    )
    return response


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
