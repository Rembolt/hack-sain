import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
os.environ["UNIFIED_DATABASE_URL"] = "sqlite:///" + (
    Path(tempfile.mkdtemp()) / "unified.db"
).as_posix()

import database
import models
import sources

models.Base.metadata.create_all(bind=database.engine)

BILLS = [
    {
        "billing_id": "BILL-001",
        "account_id": "ACC-100001",
        "start_date": "2026-08-01",
        "end_date": "2026-08-31",
        "water_m3": 25.4,
        "electricity_kwh": 430.7,
        "water_charge": 45.72,
        "electricity_charge": 87.14,
        "service_fee": 12,
        "adjustments": -5,
        "tax": 18.83,
        "total_price": 158.69,
        "currency": "CAD",
        "status": "UNPAID",
        "issued_date": "2026-09-01",
        "due_date": "2026-09-15",
        "payment_date": None,
    },
    {
        "billing_id": "BILL-002",
        "account_id": "ACC-100002",
        "start_date": "2026-08-01",
        "end_date": "2026-08-31",
        "water_m3": 19.1,
        "electricity_kwh": 375,
        "water_charge": 36,
        "electricity_charge": 74,
        "service_fee": 12,
        "adjustments": 0,
        "tax": 15.34,
        "total_price": 137.34,
        "currency": "CAD",
        "status": "PAID",
        "issued_date": "2026-09-01",
        "due_date": "2026-09-15",
        "payment_date": "2026-09-10",
    },
]


class SyncTests(unittest.TestCase):
    def setUp(self):
        self.db = database.SessionLocal()
        self.db.query(models.StoredRecord).delete()
        self.db.query(models.SyncState).delete()
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_nightly_sync_saves_every_chunk_once(self):
        pages = {
            "": {
                "chunk": [
                    {
                        "complaint_id": "COMP-002",
                        "account_id": "ACC-100002",
                        "reason": "Power Outage",
                        "updated_date": "2026-09-01T00:00:00Z",
                    }
                ],
                "next_cursor": "2026-09-01T00:00:00Z|COMP-002",
                "has_more": True,
            },
            "2026-09-01T00:00:00Z|COMP-002": {
                "chunk": [
                    {
                        "complaint_id": "COMP-003",
                        "account_id": "ACC-100003",
                        "reason": "High Water Bill",
                        "updated_date": "2026-09-02T00:00:00Z",
                    }
                ],
                "next_cursor": "2026-09-02T00:00:00Z|COMP-003",
                "has_more": False,
            },
        }
        calls = []

        def fetch(cursor, limit=100):
            calls.append(cursor)
            return pages.get(
                cursor,
                {"chunk": [], "next_cursor": cursor, "has_more": False},
            )

        first = sources.sync_sqlite(self.db, fetch)
        self.assertEqual(first["imported"], 2)
        self.assertEqual(first["chunks"], 2)
        self.assertEqual(len(sources.list_complaints(self.db)), 2)

        calls.clear()
        second = sources.sync_sqlite(self.db, fetch)
        self.assertEqual(calls, ["2026-09-02T00:00:00Z|COMP-003"])
        self.assertEqual(second["imported"], 0)
        self.assertEqual(len(sources.list_complaints(self.db)), 2)

        account = sources.load_account(self.db, "ACC-100002", lambda: [])
        self.assertEqual(account.status, 200)
        self.assertEqual(account.body["resources"]["complaints"][0]["complaintId"], "COMP-002")
        self.assertEqual(account.body["resources"]["complaints"][0]["reason"], "Power Outage")

    def test_missing_bill_is_read_from_postgres_and_then_kept(self):
        calls = {"n": 0}

        def fetch():
            calls["n"] += 1
            return BILLS

        first = sources.load_bill(self.db, "BILL-001", fetch)
        self.assertEqual(first.status, 200)
        self.assertEqual(first.body["status"], "Unpaid")
        self.assertEqual(first.body["paymentDate"], None)
        self.assertEqual(calls["n"], 1)
        stored = (
            self.db.query(models.StoredRecord)
            .filter(models.StoredRecord.kind == "billing")
            .all()
        )
        self.assertEqual([row.record_key for row in stored], ["BILL-001"])

        second = sources.load_bill(self.db, "BILL-001", fetch)
        self.assertEqual(second.status, 200)
        self.assertEqual(calls["n"], 1)

    def test_account_miss_stores_only_that_accounts_bills(self):
        calls = {"n": 0}

        def fetch():
            calls["n"] += 1
            return BILLS

        loaded = sources.load_account(self.db, "ACC-100001", fetch)
        self.assertEqual(loaded.status, 200)
        self.assertEqual(
            [bill["billingId"] for bill in loaded.body["resources"]["billing"]],
            ["BILL-001"],
        )
        self.assertEqual(loaded.body["summary"]["unpaidBills"], 1)

        sources.load_account(self.db, "ACC-100001", fetch)
        self.assertEqual(calls["n"], 1)

    def test_posted_account_does_not_call_postgres(self):
        sources.save_app_record(
            self.db,
            "account",
            {
                "accountId": "ACC-100001",
                "accountName": "North",
                "resources": {"billing": [{"billingId": "BILL-100001"}], "complaints": []},
                "summary": {"outstandingBalance": 1},
            },
        )

        def fetch():
            raise AssertionError("postgres was called")

        loaded = sources.load_account(self.db, "ACC-100001", fetch)
        self.assertEqual(loaded.status, 200)
        self.assertEqual(loaded.body["accountName"], "North")
        self.assertEqual(loaded.body["resources"]["billing"][0]["billingId"], "BILL-100001")

    def test_unreachable_postgres_on_a_miss(self):
        def fetch():
            raise sources.SourceError("down")

        missed = sources.load_bill(self.db, "BILL-404", fetch)
        self.assertEqual(missed.status, 503)

        unknown = sources.load_account(self.db, "ACC-100009", lambda: [])
        self.assertEqual(unknown.status, 404)

        sources.upsert_record(
            self.db,
            kind="complaint",
            record_key="COMP-009",
            account_id="ACC-100009",
            payload={"complaint_id": "COMP-009", "account_id": "ACC-100009", "reason": "Outage"},
            origin="sqlite",
        )
        self.db.commit()
        kept = sources.load_account(self.db, "ACC-100009", fetch)
        self.assertEqual(kept.status, 200)
        self.assertEqual(kept.body["resources"]["complaints"][0]["reason"], "Outage")
        self.assertEqual(kept.body["resources"]["billing"], [])


if __name__ == "__main__":
    unittest.main()
