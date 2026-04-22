from functools import wraps
from flask import session, jsonify
from models.user import User


def login_required(f):
    """
    Decorator that blocks unauthenticated requests with a 401.
    Usage:
        @bp.route("/protected")
        @login_required
        def protected():
            ...
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("user_id"):
            return jsonify({"error": "Authentication required."}), 401
        return f(*args, **kwargs)
    return decorated


def get_current_user() -> User | None:
    """
    Returns the User object for the active session, or None.
    Call this inside any route that needs the full user record.
    """
    user_id = session.get("user_id")
    if not user_id:
        return None
    return User.get_by_id(user_id)


def set_session(user: User) -> None:
    """Writes the minimal session payload after login/register."""
    session["user_id"] = user.id
    session["email"]   = user.email


def clear_session() -> None:
    session.clear()
