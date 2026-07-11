import bcrypt
import psycopg
from db import get_db

# Precomputed throwaway hash for login timing equalisation (#35). When an email
# doesn't exist, login still runs a bcrypt comparison against this so a missing
# account costs about the same as a real one — no email-enumeration timing side
# channel. Computed once at import (a few ms, one time).
_DUMMY_PASSWORD_HASH = bcrypt.hashpw(b"timing-equaliser-not-a-real-password", bcrypt.gensalt())


class User:
    """
    Thin data-access layer for the users table.
    No ORM — just plain SQL kept readable.
    """

    def __init__(
        self,
        id: int,
        email: str,
        password_hash: str,
        created_at: str,
        is_admin: bool = False,
        is_superadmin: bool = False,
        tier: str = "free",
        suspended: bool = False,
        last_login_at=None,
    ):
        self.id            = id
        self.email         = email
        self.password_hash = password_hash
        self.created_at    = created_at
        self.is_superadmin = bool(is_superadmin)
        # A superadmin is implicitly an admin — the admin gate treats it as one.
        self.is_admin      = bool(is_admin) or self.is_superadmin
        self.tier          = tier
        self.suspended     = bool(suspended)
        self.last_login_at = last_login_at

    # ------------------------------------------------------------------ #
    # Serialisation
    # ------------------------------------------------------------------ #
    def to_dict(self) -> dict:
        """Safe public representation — never include password_hash."""
        return {
            "id":            self.id,
            "email":         self.email,
            "created_at":    self.created_at,
            "is_admin":      self.is_admin,
            "is_superadmin": self.is_superadmin,
            "tier":          self.tier,
            "suspended":     self.suspended,
        }

    def to_admin_dict(self) -> dict:
        """Richer representation for the admin Users table. Adds last_login_at
        and beta-stub fields (activity + LTV are not tracked yet — GA4 `calc_run`
        events and billing land in later phases; rendered as placeholders)."""
        return {
            **self.to_dict(),
            "last_login_at": self.last_login_at,
            "activity":      None,   # top calc + run count — pending GA4 (#152)
            "ltv":           0.0,    # billing not live during beta
        }

    # ------------------------------------------------------------------ #
    # Password helpers
    # ------------------------------------------------------------------ #
    @staticmethod
    def hash_password(plain: str) -> str:
        return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def check_password(self, plain: str) -> bool:
        return bcrypt.checkpw(plain.encode("utf-8"), self.password_hash.encode("utf-8"))

    @staticmethod
    def dummy_password_check(plain: str) -> bool:
        """Run a throwaway bcrypt comparison against a fixed dummy hash so the
        login path costs about the same whether or not the account exists (#35).
        Always returns False; the result is discarded."""
        return bcrypt.checkpw(plain.encode("utf-8"), _DUMMY_PASSWORD_HASH)

    # ------------------------------------------------------------------ #
    # Queries
    # ------------------------------------------------------------------ #
    @classmethod
    def create(cls, email: str, plain_password: str) -> "User":
        """Insert a new user. Raises ValueError if email already exists."""
        password_hash = cls.hash_password(plain_password)
        conn = get_db()
        try:
            row = conn.execute(
                "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id",
                (email.lower().strip(), password_hash),
            ).fetchone()
            conn.commit()
        except psycopg.errors.UniqueViolation:
            conn.rollback()
            raise ValueError("An account with that email already exists.")
        return cls.get_by_id(row["id"])

    @classmethod
    def get_by_id(cls, user_id: int) -> "User | None":
        conn = get_db()
        row = conn.execute(
            "SELECT * FROM users WHERE id = %s", (user_id,)
        ).fetchone()
        return cls(**row) if row else None

    @classmethod
    def get_by_email(cls, email: str) -> "User | None":
        conn = get_db()
        row = conn.execute(
            "SELECT * FROM users WHERE email = %s", (email.lower().strip(),)
        ).fetchone()
        return cls(**row) if row else None

    @classmethod
    def update_password(cls, user_id: int, plain_password: str) -> None:
        """Replace a user's password hash. Scoped to the user's own id."""
        password_hash = cls.hash_password(plain_password)
        conn = get_db()
        conn.execute(
            "UPDATE users SET password_hash = %s WHERE id = %s",
            (password_hash, user_id),
        )
        conn.commit()

    @classmethod
    def set_admin(cls, user_id: int, is_admin: bool) -> "User | None":
        """Promote/demote a user to admin. No self-serve UI — this is the
        manual lever (used from a shell / db_init helper) for granting access
        to the /admin portal. Returns the updated user, or None if not found."""
        conn = get_db()
        conn.execute(
            "UPDATE users SET is_admin = %s WHERE id = %s",
            (bool(is_admin), user_id),
        )
        conn.commit()
        return cls.get_by_id(user_id)

    @classmethod
    def set_superadmin(cls, user_id: int, is_superadmin: bool) -> "User | None":
        """Grant/revoke superadmin. The manual bootstrap lever (DB/shell) — there
        is no UI to grant superadmin. Granting superadmin also grants admin so the
        account has full portal access; revoking superadmin leaves is_admin as-is."""
        # Granting superadmin also grants admin (superadmin implies admin);
        # revoking superadmin leaves is_admin as-is. One parameterised statement:
        # is_admin = (is_admin OR <granting>) — true when granting, unchanged when
        # revoking. Mirrors set_admin's parameterised style.
        conn = get_db()
        conn.execute(
            "UPDATE users SET is_superadmin = %s, is_admin = (is_admin OR %s) WHERE id = %s",
            (bool(is_superadmin), bool(is_superadmin), user_id),
        )
        conn.commit()
        return cls.get_by_id(user_id)

    # ------------------------------------------------------------------ #
    # Admin Users screen — list / search / tier / suspend / last-login
    # ------------------------------------------------------------------ #
    @classmethod
    def list_for_admin(cls, search: str | None = None, tier: str | None = None) -> list["User"]:
        """All accounts for the admin Users table, newest first. Optional
        case-insensitive email/name search and exact-tier filter, both pushed
        into SQL (parameterised — no f-strings). NOT user-scoped: this is an
        admin-only listing, gated at the route by admin_required."""
        clauses, params = [], []
        if search:
            clauses.append("email ILIKE %s")
            params.append(f"%{search.strip()}%")
        if tier:
            clauses.append("tier = %s")
            params.append(tier)
        where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
        conn = get_db()
        rows = conn.execute(
            f"SELECT * FROM users{where} ORDER BY created_at DESC, id DESC",
            tuple(params),
        ).fetchall()
        return [cls(**row) for row in rows]

    @classmethod
    def tier_counts(cls) -> dict:
        """Per-tier account counts for the filter chips (e.g. {'free': 1204,
        'pro': 0, 'elite': 0}). One grouped query."""
        conn = get_db()
        rows = conn.execute("SELECT tier, COUNT(*) AS n FROM users GROUP BY tier").fetchall()
        return {row["tier"]: row["n"] for row in rows}

    @classmethod
    def set_tier(cls, user_id: int, tier: str) -> "User | None":
        """Set an account's tier (admin manual comp during beta). The tier CHECK
        rejects unknown values at the DB layer. Returns the updated user, or None
        if not found."""
        conn = get_db()
        cur = conn.execute(
            "UPDATE users SET tier = %s WHERE id = %s", (tier, user_id)
        )
        conn.commit()
        return cls.get_by_id(user_id) if cur.rowcount else None

    @classmethod
    def set_suspended(cls, user_id: int, suspended: bool) -> "User | None":
        """Suspend/reinstate an account. Suspended accounts are blocked at login.
        Returns the updated user, or None if not found."""
        conn = get_db()
        cur = conn.execute(
            "UPDATE users SET suspended = %s WHERE id = %s", (bool(suspended), user_id)
        )
        conn.commit()
        return cls.get_by_id(user_id) if cur.rowcount else None

    @classmethod
    def touch_last_login(cls, user_id: int) -> None:
        """Stamp last_login_at = now() after a successful login."""
        conn = get_db()
        conn.execute("UPDATE users SET last_login_at = now() WHERE id = %s", (user_id,))
        conn.commit()

    @classmethod
    def update_email(cls, user_id: int, new_email: str) -> "User | None":
        """
        Change a user's email. Scoped to the user's own id.
        Raises ValueError if the new email is already taken — same message and
        shape as create(), so the route surfaces register's existing posture.
        """
        conn = get_db()
        try:
            conn.execute(
                "UPDATE users SET email = %s WHERE id = %s",
                (new_email.lower().strip(), user_id),
            )
            conn.commit()
        except psycopg.errors.UniqueViolation:
            conn.rollback()
            raise ValueError("An account with that email already exists.")
        return cls.get_by_id(user_id)

    # NOTE: there is deliberately no User.delete — account deletion goes through
    # services/account_deletion.delete_account (#179), the single deletion path
    # with an explicit, verified cascade across every user-scoped table.
