# GET and POST endpoints for complaints.
# GET /complaints returns one chunk of rows changed since the caller's cursor.

from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Query
from sqlalchemy import create_engine, text
from pydantic import BaseModel

app = FastAPI()


engine = create_engine("sqlite:///utility.db")

# Define a Pydantic model for the complaint data
class Complaint(BaseModel):
    complaint_id: str
    ticket_number: str
    account_id: str
    reason: str

def _split_cursor(cursor: str) -> tuple[str, str]:
    updated, separator, complaint_id = cursor.partition("|")
    if not separator:
        return cursor, ""
    return updated, complaint_id


def complaint_change_chunk(conn, cursor: str, limit: int) -> dict:
    """Rows changed after `cursor`, oldest first, at most `limit` of them.

    A cursor is `updated_date|complaint_id` from the previous chunk.
    An empty cursor starts at the oldest changed row. Rows with no
    updated_date are stamped once so later nights can tell them apart.
    """
    updated, complaint_id = _split_cursor(cursor)
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    conn.execute(
        text("""
            UPDATE complaints
            SET updated_date = COALESCE(
                NULLIF(created_date, ''),
                :stamp
            )
            WHERE updated_date IS NULL
               OR trim(updated_date) = ''
        """),
        {"stamp": stamp},
    )

    rows = conn.execute(
        text("""
            SELECT *
            FROM complaints
            WHERE :cursor = ''
               OR updated_date > :updated
               OR (
                    updated_date = :updated
                    AND complaint_id > :complaint_id
               )
            ORDER BY updated_date ASC, complaint_id ASC
            LIMIT :limit_plus
        """),
        {
            "cursor": cursor,
            "updated": updated,
            "complaint_id": complaint_id,
            "limit_plus": limit + 1,
        },
    ).all()

    has_more = len(rows) > limit
    page = rows[:limit]
    chunk = [dict(row._mapping) for row in page]

    if chunk:
        last = chunk[-1]
        next_cursor = f"{last['updated_date']}|{last['complaint_id']}"
    else:
        next_cursor = cursor

    return {
        "chunk": chunk,
        "next_cursor": next_cursor,
        "has_more": has_more,
    }


@app.get("/complaints")
def get_complaints(
    cursor: str = "",
    limit: int = Query(default=100, ge=1, le=500),
):
    with engine.begin() as conn:
        return complaint_change_chunk(conn, cursor, limit)


@app.post("/complaints")
def create_complaint(complaint: Complaint):

    try:
        with engine.connect() as conn:

            conn.execute(
                text("""
                    INSERT INTO complaints
                    (
                        complaint_id,
                        ticket_number,
                        account_id,
                        reason,
                        updated_date
                    )
                    VALUES
                    (
                        :id,
                        :ticket,
                        :account,
                        :reason,
                        :updated
                    )
                """),
                {
                    "id": complaint.complaint_id,
                    "ticket": complaint.ticket_number,
                    "account": complaint.account_id,
                    "reason": complaint.reason,
                    "updated": datetime.now(timezone.utc).strftime(
                        "%Y-%m-%dT%H:%M:%SZ"
                    ),
                }
            )

            conn.commit()

        return {"success": True}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.get("/accounts/{account_id}/complaints")
def get_account_complaints(account_id: str):

    with engine.connect() as conn:

        results = conn.execute(
            text("""
                SELECT *
                FROM complaints
                WHERE account_id = :account
            """),
            {"account": account_id}
        )

        return [
            dict(row._mapping)
            for row in results
        ]