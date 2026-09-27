# GET and POST endpoints for complaints

from fastapi import FastAPI, HTTPException
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

@app.get("/complaints")
def get_complaints():
    with engine.connect() as conn:

        results = conn.execute(
            text("SELECT * FROM complaints")
        )

        return [
            dict(row._mapping)
            for row in results
        ]


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
                        reason
                    )
                    VALUES
                    (
                        :id,
                        :ticket,
                        :account,
                        :reason
                    )
                """),
                {
                    "id": complaint.complaint_id,
                    "ticket": complaint.ticket_number,
                    "account": complaint.account_id,
                    "reason": complaint.reason
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