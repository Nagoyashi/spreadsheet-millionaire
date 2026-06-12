import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from db import get_db

# Reset tokens live for 60 minutes and are single-use. The raw token is never
# stored — only its SHA-256 hex digest — so a database leak cannot be turned
# back into a working reset link. The raw value exists only in the emailed link
# and, transiently, in the request that consumes it.
TOKEN_TTL_MINUTES = 60


class PasswordResetToken:
    """
    Data-access layer for password_reset_tokens.

    No ORM — plain parameterised SQL, same style as the User / SavedCalculator
    models. Hashing lives here so there is exactly one digest implementation.
    """

    # ------------------------------------------------------------------ #
    # Hashing
    # ------------------------------------------------------------------ #
    @staticmethod
    def hash_token(raw_token: str) -> str:
        """SHA-256 hex digest of a raw token. The only thing we ever store."""
        return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    # ------------------------------------------------------------------ #
    # Queries
    # ------------------------------------------------------------------ #
    @classmethod
    def create(cls, user_id: int) -> str:
        """
        Generate a fresh reset token for a user, store only its hash, and return
        the RAW token to the caller (for embedding in the email link). The raw
        token is never persisted.
        """
        raw_token  = secrets.token_urlsafe(32)
        token_hash = cls.hash_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_TTL_MINUTES)

        conn = get_db()
        conn.execute(
            """
            INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
            VALUES (%s, %s, %s)
            """,
            (user_id, token_hash, expires_at),
        )
        conn.commit()
        return raw_token

    @classmethod
    def find_valid_by_hash(cls, token_hash: str) -> dict | None:
        """
        Return the unused, unexpired token row for this hash, or None.
        A None result covers every failure case (unknown / expired / used) so
        the caller can emit one generic error without distinguishing why.
        """
        conn = get_db()
        return conn.execute(
            """
            SELECT id, user_id
            FROM password_reset_tokens
            WHERE token_hash = %s
              AND used_at IS NULL
              AND expires_at > now()
            """,
            (token_hash,),
        ).fetchone()

    @classmethod
    def mark_used(cls, token_id: int) -> None:
        """Stamp a token consumed. Single-use enforcement."""
        conn = get_db()
        conn.execute(
            """
            UPDATE password_reset_tokens
            SET used_at = now()
            WHERE id = %s AND used_at IS NULL
            """,
            (token_id,),
        )
        conn.commit()

    @classmethod
    def invalidate_all_for_user(cls, user_id: int) -> None:
        """
        Mark every still-unused token for a user as consumed. Used both when a
        new request supersedes earlier ones and after a successful reset, so no
        other outstanding link for that account stays live.
        """
        conn = get_db()
        conn.execute(
            """
            UPDATE password_reset_tokens
            SET used_at = now()
            WHERE user_id = %s AND used_at IS NULL
            """,
            (user_id,),
        )
        conn.commit()

    @classmethod
    def delete_expired(cls) -> None:
        """
        Opportunistic cleanup — delete expired rows for all users. Called on each
        forgot-password request so no cron job is needed.
        """
        conn = get_db()
        conn.execute(
            "DELETE FROM password_reset_tokens WHERE expires_at < now()"
        )
        conn.commit()
