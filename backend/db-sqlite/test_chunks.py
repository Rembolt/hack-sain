import sys
import tempfile
import unittest
from pathlib import Path

from sqlalchemy import create_engine, text

sys.path.insert(0, str(Path(__file__).resolve().parent))
import main


def _engine():
    path = Path(tempfile.mkdtemp()) / "utility.db"
    engine = create_engine("sqlite:///" + path.as_posix())
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE complaints (
                complaint_id TEXT PRIMARY KEY,
                ticket_number TEXT UNIQUE NOT NULL,
                account_id TEXT NOT NULL,
                reason TEXT NOT NULL,
                category TEXT,
                description TEXT,
                priority TEXT,
                status TEXT,
                assigned_to TEXT,
                created_date TEXT,
                updated_date TEXT,
                closed_date TEXT,
                resolution TEXT
            )
        """))
        conn.execute(text("""
            INSERT INTO complaints (
                complaint_id, ticket_number, account_id, reason
            ) VALUES
            ('COMP-002', 'TKT-002', 'ACC-100002', 'Power Outage'),
            ('COMP-003', 'TKT-003', 'ACC-100003', 'High Water Bill'),
            ('COMP-004', 'TKT-004', 'ACC-100004', 'Meter Reading Error')
        """))
    return engine


class ChunkTests(unittest.TestCase):
    def setUp(self):
        main.engine = _engine()

    def test_get_returns_changed_rows_in_chunks(self):
        first = main.get_complaints(cursor="", limit=2)
        self.assertEqual(len(first["chunk"]), 2)
        self.assertTrue(first["has_more"])
        self.assertIn("|", first["next_cursor"])

        second = main.get_complaints(cursor=first["next_cursor"], limit=2)
        self.assertEqual(
            [row["complaint_id"] for row in second["chunk"]],
            ["COMP-004"],
        )
        self.assertFalse(second["has_more"])

        done = main.get_complaints(cursor=second["next_cursor"], limit=2)
        self.assertEqual(done["chunk"], [])
        self.assertFalse(done["has_more"])

    def test_new_row_is_the_next_chunk(self):
        first = main.get_complaints(cursor="", limit=100)
        self.assertFalse(first["has_more"])
        created = main.create_complaint(
            main.Complaint(
                complaint_id="COMP-009",
                ticket_number="TKT-009",
                account_id="ACC-100009",
                reason="New outage",
            )
        )
        self.assertTrue(created["success"])

        nxt = main.get_complaints(cursor=first["next_cursor"], limit=100)
        self.assertEqual(
            [row["complaint_id"] for row in nxt["chunk"]],
            ["COMP-009"],
        )


if __name__ == "__main__":
    unittest.main()
