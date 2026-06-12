import bcrypt
import psycopg
from db import get_db


class User:
    """
    Thin data-access layer for the users table.
    No ORM — just plain SQL kept readable.
    """

    def __init__(self, id: int, email: str, password_hash: str, created_at: str):
        self.id            = id
        self.email         = email
        self.password_hash = password_hash
        self.created_at    = created_at

    # ------------------------------------------------------------------ #
    # Serialisation
    # ------------------------------------------------------------------ #
    def to_dict(self) -> dict:
        """Safe public representation — never include password_hash."""
        return {
            "id":         self.id,
            "email":      self.email,
            "created_at": self.created_at,
        }

    # ------------------------------------------------------------------ #
    # Password helpers
    # ------------------------------------------------------------------ #
    @staticmethod
    def hash_password(plain: str) -> str:
        return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def check_password(self, plain: str) -> bool:
        return bcrypt.checkpw(plain.encode("utf-8"), self.password_hash.encode("utf-8"))

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

    @classmethod
    def delete(cls, user_id: int) -> bool:
        """
        Permanently deletes a user and all their saved calculations.
        The ON DELETE CASCADE on saved_calculators handles the cascade.
        Returns True if a row was deleted, False if user not found.
        """
        conn = get_db()
        cursor = conn.execute(
            "DELETE FROM users WHERE id = %s", (user_id,)
        )
        conn.commit()
        return cursor.rowcount > 0
