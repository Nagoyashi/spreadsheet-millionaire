from flask import Blueprint, request, jsonify, session
from marshmallow import ValidationError

from app import limiter
from config import Config
from models.user import User
from models.password_reset import PasswordResetToken
from schemas.user_schema import (
    RegisterSchema, LoginSchema,
    ResetPasswordSchema, ChangePasswordSchema, ChangeEmailSchema,
)
from services.email import send_welcome_email, send_password_reset_email
from utils.auth_helpers import (
    set_session, clear_session, get_current_user,
    csrf_protect, generate_csrf_token, login_required,
)

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

register_schema        = RegisterSchema()
login_schema           = LoginSchema()
reset_password_schema  = ResetPasswordSchema()
change_password_schema = ChangePasswordSchema()
change_email_schema    = ChangeEmailSchema()

# Uniform forgot-password response — identical body on every path so the
# endpoint never reveals whether an email is registered.
_FORGOT_PASSWORD_MESSAGE = "If that email exists, a reset link has been sent."


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

    # Suspended accounts (set from the admin Users screen) can't log in. Checked
    # only after the password verifies, so it doesn't leak which emails exist.
    if user.suspended:
        return jsonify({"error": "This account has been suspended."}), 403

    User.touch_last_login(user.id)
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


@bp.route("/forgot-password", methods=["POST"])
@limiter.limit("3 per hour")
@csrf_protect
def forgot_password():
    """
    Begin a password reset.
    Body: { email }

    Always returns the SAME 200 body regardless of whether the email is
    registered, the input is malformed, or the email send fails. This endpoint
    must never reveal account existence. No schema 422 path for the same reason
    — a bad email simply falls through to the uniform response.
    """
    # Opportunistic cleanup — no cron needed.
    PasswordResetToken.delete_expired()

    body  = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()

    user = User.get_by_email(email) if email else None

    if user:
        # Supersede any earlier unused tokens, then issue a fresh one. The raw
        # token exists only here and in the email link — only its hash is stored.
        PasswordResetToken.invalidate_all_for_user(user.id)
        raw_token = PasswordResetToken.create(user.id)
        reset_url = f"{Config.APP_BASE_URL}/reset-password/{raw_token}"

        # Best-effort send — a failure is logged (without the link) and still
        # returns the uniform 200. send_password_reset_email swallows its own
        # errors; the guard keeps the response path bulletproof regardless.
        try:
            send_password_reset_email(user.email, reset_url)
        except Exception:
            pass

    return jsonify({"message": _FORGOT_PASSWORD_MESSAGE}), 200


@bp.route("/reset-password", methods=["POST"])
@limiter.limit("10 per hour; 5 per minute")
@csrf_protect
def reset_password():
    """
    Complete a password reset.
    Body: { token, password }

    Token-first: an unknown / expired / already-used token yields one generic
    400 with no hint as to why. Only on a valid token do we validate the new
    password (422 on a weak one) and commit.
    """
    body  = request.get_json(silent=True) or {}
    token = body.get("token", "")

    # Generic failure for any token problem — never distinguish the reason.
    if not token:
        return jsonify({"error": "This reset link is invalid or has expired."}), 400

    token_hash = PasswordResetToken.hash_token(token)
    row = PasswordResetToken.find_valid_by_hash(token_hash)
    if not row:
        return jsonify({"error": "This reset link is invalid or has expired."}), 400

    # Valid token — now enforce the password rules (reused from the schema).
    try:
        data = reset_password_schema.load({"password": body.get("password", "")})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422

    User.update_password(row["user_id"], data["password"])
    PasswordResetToken.mark_used(row["id"])
    # Invalidate any other outstanding link for this account.
    PasswordResetToken.invalidate_all_for_user(row["user_id"])

    return jsonify({"message": "Your password has been updated. You can now sign in."}), 200


@bp.route("/change-password", methods=["POST"])
@login_required
@csrf_protect
@limiter.limit("10 per hour; 5 per minute")
def change_password():
    """
    Change the authenticated user's password.
    Body: { current_password, new_password }

    Current password verified via bcrypt; new password through the shared schema.
    A wrong current password gets a generic 401.
    """
    try:
        data = change_password_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422

    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found."}), 404

    if not user.check_password(data["current_password"]):
        return jsonify({"error": "Current password is incorrect."}), 401

    User.update_password(user.id, data["new_password"])
    return jsonify({"message": "Password updated."}), 200


@bp.route("/change-email", methods=["POST"])
@login_required
@csrf_protect
@limiter.limit("10 per hour; 5 per minute")
def change_email():
    """
    Change the authenticated user's email.
    Body: { password, new_email }

    Password re-confirmation required. A duplicate email returns the same 409
    shape register uses for duplicates — matching register's existing posture
    rather than inventing a new enumeration surface.
    """
    try:
        data = change_email_schema.load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 422

    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found."}), 404

    if not user.check_password(data["password"]):
        return jsonify({"error": "Incorrect password."}), 401

    try:
        updated = User.update_email(user.id, data["new_email"])
    except ValueError as err:
        return jsonify({"error": str(err)}), 409

    # Keep the session's cached email in sync with the new address.
    set_session(updated)
    return jsonify({"user": updated.to_dict()}), 200


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
