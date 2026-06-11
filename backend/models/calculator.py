from psycopg.types.json import Jsonb
from db import get_db


class SavedCalculator:
    """
    Data-access layer for the saved_calculators table.
    data is a JSONB column; psycopg round-trips it to/from a Python dict, so no
    manual json.dumps/loads — the value already arrives (and is stored) as the
    same dict the route works with.
    """

    def __init__(
        self,
        id: int,
        user_id: int,
        name: str,
        calc_type: str,
        data: dict,         # JSONB, already decoded to a dict by psycopg
        created_at: str,
        updated_at: str,
    ):
        self.id         = id
        self.user_id    = user_id
        self.name       = name
        self.calc_type  = calc_type
        self._data      = data
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
            "data":       self._data,                   # already a dict
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    # ------------------------------------------------------------------ #
    # Queries
    # ------------------------------------------------------------------ #
    @classmethod
    def create(cls, user_id: int, name: str, calc_type: str, data: dict) -> "SavedCalculator":
        conn = get_db()
        row = conn.execute(
            """
            INSERT INTO saved_calculators (user_id, name, calc_type, data)
            VALUES (%s, %s, %s, %s)
            RETURNING id
            """,
            (user_id, name.strip(), calc_type, Jsonb(data)),
        ).fetchone()
        conn.commit()
        return cls.get_by_id(row["id"], user_id)

    @classmethod
    def get_by_id(cls, calc_id: int, user_id: int) -> "SavedCalculator | None":
        """Fetches by id AND user_id to prevent cross-user access."""
        conn = get_db()
        row = conn.execute(
            "SELECT * FROM saved_calculators WHERE id = %s AND user_id = %s",
            (calc_id, user_id),
        ).fetchone()
        return cls(**row) if row else None

    @classmethod
    def get_all_for_user(cls, user_id: int) -> list["SavedCalculator"]:
        conn = get_db()
        rows = conn.execute(
            """
            SELECT * FROM saved_calculators
            WHERE user_id = %s
            ORDER BY updated_at DESC
            """,
            (user_id,),
        ).fetchall()
        return [cls(**row) for row in rows]

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
        new_data = Jsonb(data if data is not None else existing._data)

        conn = get_db()
        conn.execute(
            """
            UPDATE saved_calculators
            SET name = %s, data = %s
            WHERE id = %s AND user_id = %s
            """,
            (new_name, new_data, calc_id, user_id),
        )
        conn.commit()

        return cls.get_by_id(calc_id, user_id)

    @classmethod
    def delete(cls, calc_id: int, user_id: int) -> bool:
        """Returns True if a row was deleted, False if not found / wrong user."""
        conn = get_db()
        cursor = conn.execute(
            "DELETE FROM saved_calculators WHERE id = %s AND user_id = %s",
            (calc_id, user_id),
        )
        conn.commit()
        return cursor.rowcount > 0
