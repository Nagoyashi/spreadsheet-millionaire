import json
import sqlite3
from db_init import get_connection


class SavedCalculator:
    """
    Data-access layer for the saved_calculators table.
    data is stored as a JSON string in SQLite and deserialised on read.
    """

    def __init__(
        self,
        id: int,
        user_id: int,
        name: str,
        calc_type: str,
        data: str,          # raw JSON string from DB
        created_at: str,
        updated_at: str,
    ):
        self.id         = id
        self.user_id    = user_id
        self.name       = name
        self.calc_type  = calc_type
        self._data_raw  = data
        self.created_at = created_at
        self.updated_at = updated_at

    # ------------------------------------------------------------------ #
    # Serialisation
    # ------------------------------------------------------------------ #
    def to_dict(self) -> dict:
        return {
            "id":         self.id,
            "user_id":    self.user_id,
            "name":       self.name,
            "calc_type":  self.calc_type,
            "data":       json.loads(self._data_raw),   # return as object, not string
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    # ------------------------------------------------------------------ #
    # Queries
    # ------------------------------------------------------------------ #
    @classmethod
    def create(cls, user_id: int, name: str, calc_type: str, data: dict) -> "SavedCalculator":
        with get_connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO saved_calculators (user_id, name, calc_type, data)
                VALUES (?, ?, ?, ?)
                """,
                (user_id, name.strip(), calc_type, json.dumps(data)),
            )
            conn.commit()
            return cls.get_by_id(cursor.lastrowid, user_id)

    @classmethod
    def get_by_id(cls, calc_id: int, user_id: int) -> "SavedCalculator | None":
        """Fetches by id AND user_id to prevent cross-user access."""
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM saved_calculators WHERE id = ? AND user_id = ?",
                (calc_id, user_id),
            ).fetchone()
        return cls(**dict(row)) if row else None

    @classmethod
    def get_all_for_user(cls, user_id: int) -> list["SavedCalculator"]:
        with get_connection() as conn:
            rows = conn.execute(
                """
                SELECT * FROM saved_calculators
                WHERE user_id = ?
                ORDER BY updated_at DESC
                """,
                (user_id,),
            ).fetchall()
        return [cls(**dict(row)) for row in rows]

    @classmethod
    def update(cls, calc_id: int, user_id: int, name: str | None, data: dict | None) -> "SavedCalculator | None":
        """
        Partial update — only touches fields that are provided.
        Returns None if the record doesn't exist or belongs to another user.
        """
        existing = cls.get_by_id(calc_id, user_id)
        if not existing:
            return None

        new_name = name.strip() if name is not None else existing.name
        new_data = json.dumps(data) if data is not None else existing._data_raw

        with get_connection() as conn:
            conn.execute(
                """
                UPDATE saved_calculators
                SET name = ?, data = ?
                WHERE id = ? AND user_id = ?
                """,
                (new_name, new_data, calc_id, user_id),
            )
            conn.commit()

        return cls.get_by_id(calc_id, user_id)

    @classmethod
    def delete(cls, calc_id: int, user_id: int) -> bool:
        """Returns True if a row was deleted, False if not found / wrong user."""
        with get_connection() as conn:
            cursor = conn.execute(
                "DELETE FROM saved_calculators WHERE id = ? AND user_id = ?",
                (calc_id, user_id),
            )
            conn.commit()
        return cursor.rowcount > 0
