"""Copies mock data into the unified database.

The web app reads and writes only this database. Postgres is queried live
when a requested bill is missing, and that bill is saved here. The SQLite
complaints mock is not read live: POST /sync/nightly copies its changed
chunks, and the process also does that at NIGHTLY_SYNC_TIME.
"""

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session

from database import engine
import models


class SourceError(Exception):
    pass


def utcnow() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def sqlite_mock_url() -> str:
    return os.environ.get("SQLITE_MOCK_URL", "http://127.0.0.1:8001").rstrip("/")


def postgres_mock_url() -> str:
    return os.environ.get("POSTGRES_MOCK_URL", "http://127.0.0.1:8002").rstrip("/")


def ensure_profile_columns() -> None:
    """Add profile columns on a database created before they existed."""
    with engine.begin() as conn:
        rows = conn.execute(text("PRAGMA table_info(authorization)")).all()
        present = {row[1] for row in rows}
        for name in ("display_name", "title", "phone"):
            if name not in present:
                conn.execute(text(
                    f"ALTER TABLE authorization ADD COLUMN {name} VARCHAR NOT NULL DEFAULT ''"
                ))


def configured_admins() -> list[dict]:
    """Two admins from the environment. Passwords are never written in source."""
    found = []
    for index in (1, 2):
        email = os.environ.get(f"ADMIN_{index}_EMAIL", "").strip().lower()
        password = os.environ.get(f"ADMIN_{index}_PASSWORD", "")
        if not email or not password:
            continue
        found.append({
            "username": email,
            "password": password,
            "name": os.environ.get(f"ADMIN_{index}_NAME", "").strip() or email,
            "title": os.environ.get(f"ADMIN_{index}_TITLE", "").strip() or "Service desk admin",
            "phone": os.environ.get(f"ADMIN_{index}_PHONE", "").strip(),
        })
    return found


def ensure_admins(db: Session) -> int:
    from security import hash_password

    created = 0
    for spec in configured_admins():
        existing = (
            db.query(models.Authorization)
            .filter(models.Authorization.username == spec["username"])
            .first()
        )
        if existing:
            continue
        db.add(
            models.Authorization(
                username=spec["username"],
                password_hash=hash_password(spec["password"]),
                is_admin=True,
                display_name=spec["name"],
                title=spec["title"],
                phone=spec["phone"],
            )
        )
        created += 1
    if created:
        db.commit()
    return created


def nightly_sync_time() -> str:
    """Local HH:MM, or '' when the clock is off. POST /sync/nightly still runs."""
    raw = os.environ.get("NIGHTLY_SYNC_TIME", "02:00").strip()
    if raw.lower() in {"", "off", "disabled"}:
        return ""
    hour_text, separator, minute_text = raw.partition(":")
    if not separator:
        return "02:00"
    try:
        hour = int(hour_text)
        minute = int(minute_text)
    except ValueError:
        return "02:00"
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        return "02:00"
    return f"{hour:02d}:{minute:02d}"


def fetch_json(url: str):
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise SourceError(str(exc)) from exc


def fetch_sqlite_chunk(cursor: str, limit: int = 100) -> dict:
    query = urllib.parse.urlencode({"cursor": cursor, "limit": str(limit)})
    payload = fetch_json(f"{sqlite_mock_url()}/complaints?{query}")
    if not isinstance(payload, dict) or not isinstance(payload.get("chunk"), list):
        raise SourceError("SQLite mock did not return a chunk.")
    return payload


def fetch_postgres_billing() -> list:
    payload = fetch_json(f"{postgres_mock_url()}/billing")
    if not isinstance(payload, list):
        raise SourceError("Postgres mock did not return a billing list.")
    return payload


@dataclass
class ReadResult:
    status: int
    body: dict


def upsert_record(
    db: Session,
    *,
    kind: str,
    record_key: str,
    account_id: str | None,
    payload: dict,
    origin: str,
) -> None:
    existing = (
        db.query(models.StoredRecord)
        .filter(
            models.StoredRecord.kind == kind,
            models.StoredRecord.record_key == record_key,
        )
        .one_or_none()
    )
    encoded = json.dumps(payload)
    now = utcnow()
    if existing is None:
        db.add(
            models.StoredRecord(
                kind=kind,
                record_key=record_key,
                account_id=account_id,
                payload=encoded,
                origin=origin,
                updated_at=now,
            )
        )
        return

    existing.account_id = account_id
    existing.payload = encoded
    existing.origin = origin
    existing.updated_at = now


def _identity(kind: str, body: dict) -> tuple[str, str | None]:
    if kind == "account":
        account_id = str(body.get("accountId") or "")
        return account_id, account_id or None
    if kind == "complaint":
        return str(body.get("complaintId") or ""), None
    if kind == "file":
        ownership = body.get("ownership")
        account_id = ""
        if isinstance(ownership, dict):
            account_id = str(ownership.get("accountId") or "")
        return str(body.get("fileId") or ""), account_id or None
    if kind == "service-visit":
        account_id = str(body.get("accountId") or "")
        return str(body.get("visitId") or ""), account_id or None
    if kind == "billing":
        key = str(body.get("billingId") or body.get("billing_id") or "")
        account_id = str(body.get("accountId") or body.get("account_id") or "")
        return key, account_id or None
    return "", None


def save_app_record(db: Session, kind: str, body: dict) -> ReadResult:
    if not isinstance(body, dict):
        return ReadResult(400, {"message": "Request body must be a JSON object."})

    record_key, account_id = _identity(kind, body)
    if not record_key:
        return ReadResult(400, {"message": "Record is missing its id."})

    upsert_record(
        db,
        kind=kind,
        record_key=record_key,
        account_id=account_id,
        payload=body,
        origin="app",
    )
    db.commit()
    return ReadResult(200, {"valid": True, "kind": kind, "id": record_key})


def _load_payloads(db: Session, kind: str, account_id: str | None = None) -> list[dict]:
    query = db.query(models.StoredRecord).filter(models.StoredRecord.kind == kind)
    if account_id is not None:
        query = query.filter(models.StoredRecord.account_id == account_id)
    rows = []
    for record in query.all():
        payload = json.loads(record.payload)
        if isinstance(payload, dict):
            rows.append(payload)
    return rows


def _as_number(value) -> float:
    if value is None or value == "":
        return 0.0
    return float(value)


def _as_date(value):
    if value in (None, ""):
        return None
    return str(value)[:10]


def project_bill(row: dict) -> dict:
    """Postgres billing row, or a bill already stored in the account shape."""
    if "billingId" in row:
        return row

    status_names = {
        "UNPAID": "Unpaid",
        "PAID": "Paid",
        "ISSUED": "Issued",
        "OVERDUE": "Overdue",
        "VOID": "Void",
        "CREDITED": "Credited",
    }
    raw_status = str(row.get("status") or "")
    status = status_names.get(raw_status.upper(), raw_status)
    payment = _as_date(row.get("payment_date"))
    if status != "Paid":
        payment = None

    return {
        "billingId": row.get("billing_id") or "",
        "billingPeriod": {
            "startDate": _as_date(row.get("start_date")) or "",
            "endDate": _as_date(row.get("end_date")) or "",
        },
        "usage": {
            "waterM3": _as_number(row.get("water_m3")),
            "electricityKWh": _as_number(row.get("electricity_kwh")),
        },
        "priceBreakdown": {
            "waterCharge": _as_number(row.get("water_charge")),
            "electricityCharge": _as_number(row.get("electricity_charge")),
            "serviceFee": _as_number(row.get("service_fee")),
            "adjustments": _as_number(row.get("adjustments")),
            "tax": _as_number(row.get("tax")),
        },
        "totalPrice": _as_number(row.get("total_price")),
        "currency": row.get("currency") or "CAD",
        "status": status,
        "issuedDate": _as_date(row.get("issued_date")) or "",
        "dueDate": _as_date(row.get("due_date")) or "",
        "paymentDate": payment,
    }


def project_complaint(row: dict) -> dict:
    """Leave an app complaint as posted. A SQLite chunk row is only relabeled."""
    if "complaintId" in row:
        return row

    closed = row.get("closed_date") or None
    updated = row.get("updated_date") or row.get("created_date") or ""
    created = row.get("created_date") or updated
    resolution = row.get("resolution") or ""
    return {
        "complaintId": row.get("complaint_id") or "",
        "ticketNumber": row.get("ticket_number") or "",
        "reason": row.get("reason") or "",
        "category": row.get("category") or "",
        "description": row.get("description") or "",
        "priority": row.get("priority") or "",
        "status": row.get("status") or "",
        "assignedTo": {
            "employeeId": "",
            "employeeName": row.get("assigned_to") or "",
        },
        "createdDate": str(created)[:10],
        "lastUpdatedDate": str(updated)[:10],
        "closedDate": None if not closed else str(closed)[:10],
        "resolution": {
            "resolutionCode": "",
            "resolutionDescription": resolution if isinstance(resolution, str) else "",
        },
    }


def _stored_account(db: Session, account_id: str) -> dict | None:
    record = (
        db.query(models.StoredRecord)
        .filter(
            models.StoredRecord.kind == "account",
            models.StoredRecord.record_key == account_id,
        )
        .one_or_none()
    )
    if record is None:
        return None
    payload = json.loads(record.payload)
    return payload if isinstance(payload, dict) else None


def _list_of(account: dict | None, key: str) -> list:
    if not account:
        return []
    resources = account.get("resources")
    if not isinstance(resources, dict):
        return []
    value = resources.get(key)
    return value if isinstance(value, list) else []


def _store_postgres_bills(db: Session, rows: list, account_id: str | None) -> list[dict]:
    saved = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        row_account = str(row.get("account_id") or row.get("accountId") or "")
        if account_id is not None and row_account != account_id:
            continue
        bill = project_bill(row)
        key = str(bill.get("billingId") or "")
        if not key:
            continue
        upsert_record(
            db,
            kind="billing",
            record_key=key,
            account_id=row_account or None,
            payload=bill,
            origin="postgres",
        )
        saved.append(bill)
    if saved:
        db.commit()
    return saved


def load_bill(db: Session, billing_id: str, fetch_billing=fetch_postgres_billing) -> ReadResult:
    stored = (
        db.query(models.StoredRecord)
        .filter(
            models.StoredRecord.kind == "billing",
            models.StoredRecord.record_key == billing_id,
        )
        .one_or_none()
    )
    if stored is not None:
        return ReadResult(200, json.loads(stored.payload))

    try:
        rows = fetch_billing()
    except SourceError:
        return ReadResult(503, {"message": "Billing source is not reachable."})

    match = None
    for row in rows:
        if not isinstance(row, dict):
            continue
        key = str(row.get("billing_id") or row.get("billingId") or "")
        if key == billing_id:
            match = row
            break

    if match is None:
        return ReadResult(404, {"message": "No bill with that id."})

    saved = _store_postgres_bills(db, [match], None)
    if not saved:
        return ReadResult(404, {"message": "No bill with that id."})
    return ReadResult(200, saved[0])


def _summarize(bills: list, complaints: list) -> dict:
    unpaid = [bill for bill in bills if bill.get("status") != "Paid"]
    opened = [
        complaint
        for complaint in complaints
        if str(complaint.get("status") or "").lower() == "open"
    ]
    outstanding = 0.0
    for bill in unpaid:
        try:
            outstanding += float(bill.get("totalPrice") or 0)
        except (TypeError, ValueError):
            continue
    return {
        "outstandingBalance": round(outstanding, 2),
        "totalBills": len(bills),
        "unpaidBills": len(unpaid),
        "totalComplaints": len(complaints),
        "openComplaints": len(opened),
    }


def _blank_account(account_id: str) -> dict:
    return {
        "accountId": account_id,
        "accountName": "",
        "clientInfo": {},
        "resources": {"billing": [], "complaints": []},
        "summary": _summarize([], []),
    }


def load_account(db: Session, account_id: str, fetch_billing=fetch_postgres_billing) -> ReadResult:
    posted = _stored_account(db, account_id)
    bills = _list_of(posted, "billing")

    if not bills:
        bills = [project_bill(row) for row in _load_payloads(db, "billing", account_id)]

    posted_complaints = [project_complaint(row) for row in _list_of(posted, "complaints")]
    seen = {
        str(row.get("complaintId") or "")
        for row in posted_complaints
        if row.get("complaintId")
    }
    complaints = list(posted_complaints)
    for row in _load_payloads(db, "complaint", account_id):
        projected = project_complaint(row)
        key = str(projected.get("complaintId") or "")
        if key and key in seen:
            continue
        if key:
            seen.add(key)
        complaints.append(projected)

    if not bills:
        try:
            rows = fetch_billing()
        except SourceError:
            if posted is None and not complaints:
                return ReadResult(503, {"message": "Billing source is not reachable."})
            rows = []
        if rows:
            bills = _store_postgres_bills(db, rows, account_id)

    if posted is None and not bills and not complaints:
        return ReadResult(404, {"message": "No account with that id."})

    account = json.loads(json.dumps(posted)) if posted else _blank_account(account_id)
    resources = account.get("resources")
    if not isinstance(resources, dict):
        resources = {}
        account["resources"] = resources
    resources["billing"] = bills
    resources["complaints"] = complaints
    posted_bills = _list_of(posted, "billing")
    if (
        bills != posted_bills
        or complaints != posted_complaints
        or not isinstance(account.get("summary"), dict)
    ):
        account["summary"] = _summarize(bills, complaints)
    return ReadResult(200, account)


def list_complaints(db: Session) -> list[dict]:
    return _load_payloads(db, "complaint")


def sync_sqlite(db: Session, fetch_chunk=fetch_sqlite_chunk) -> dict:
    """Pull every changed SQLite chunk and save it. Safe to run again."""
    state = db.get(models.SyncState, "sqlite")
    if state is None:
        state = models.SyncState(source="sqlite", cursor="", last_imported=0)
        db.add(state)
        db.commit()

    imported = 0
    chunks = 0
    cursor = state.cursor or ""

    try:
        while chunks < 10000:
            page = fetch_chunk(cursor)
            rows = page.get("chunk") or []
            if not isinstance(rows, list):
                raise SourceError("SQLite mock did not return a chunk.")

            previous = cursor
            for row in rows:
                if not isinstance(row, dict):
                    continue
                key = str(row.get("complaint_id") or "")
                if not key:
                    continue
                account_id = str(row.get("account_id") or "") or None
                upsert_record(
                    db,
                    kind="complaint",
                    record_key=key,
                    account_id=account_id,
                    payload=row,
                    origin="sqlite",
                )
                imported += 1

            chunks += 1
            cursor = str(page.get("next_cursor") or cursor)
            state.cursor = cursor
            state.last_run_at = utcnow()
            state.last_imported = imported
            db.commit()

            if not rows or not page.get("has_more") or cursor == previous:
                break
    except Exception:
        db.rollback()
        raise

    return {
        "source": "sqlite",
        "imported": imported,
        "chunks": chunks,
        "cursor": state.cursor,
        "ran_at": state.last_run_at,
    }


def sync_status(db: Session) -> dict:
    state = db.get(models.SyncState, "sqlite")
    return {
        "source": "sqlite",
        "time": nightly_sync_time() or None,
        "cursor": "" if state is None else state.cursor,
        "last_run_at": None if state is None else state.last_run_at,
        "last_imported": 0 if state is None else state.last_imported,
    }
