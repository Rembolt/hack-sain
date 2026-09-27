from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine, text
from pydantic import BaseModel
from datetime import date


app = FastAPI()

engine = create_engine(
    "postgresql://postgres:admin123@localhost:5432/billing_db"
)



class Billing(BaseModel):
    billing_id: str
    account_id: str

    start_date: date
    end_date: date

    water_m3: float
    electricity_kwh: float

    water_charge: float
    electricity_charge: float
    service_fee: float
    adjustments: float
    tax: float

    total_price: float

    currency: str
    status: str

    issued_date: date
    due_date: date
    payment_date: date | None = None

@app.get("/billing")
def get_billing():

    with engine.connect() as conn:

        result = conn.execute(
            text("SELECT * FROM billing")
        )

        return [
            dict(row._mapping)
            for row in result
        ]



@app.post("/billing")
def create_bill(bill: Billing):

    try:

        with engine.connect() as conn:

            conn.execute(
                text("""
                    INSERT INTO billing
                    (
                        billing_id,
                        account_id,
                        start_date,
                        end_date,
                        water_m3,
                        electricity_kwh,
                        water_charge,
                        electricity_charge,
                        service_fee,
                        adjustments,
                        tax,
                        total_price,
                        currency,
                        status,
                        issued_date,
                        due_date,
                        payment_date
                    )
                    VALUES
                    (
                        :billing_id,
                        :account_id,
                        :start_date,
                        :end_date,
                        :water_m3,
                        :electricity_kwh,
                        :water_charge,
                        :electricity_charge,
                        :service_fee,
                        :adjustments,
                        :tax,
                        :total_price,
                        :currency,
                        :status,
                        :issued_date,
                        :due_date,
                        :payment_date
                    )
                """),
                bill.model_dump()
            )

            conn.commit()

            return {
                "success": True,
                "billing_id": bill.billing_id
            }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.put("/billing/{billing_id}")
def update_bill(
    billing_id: str,
    bill: Billing
):

    try:

        with engine.connect() as conn:

            result = conn.execute(
                text("""
                    UPDATE billing
                    SET
                        account_id = :account_id,
                        start_date = :start_date,
                        end_date = :end_date,
                        water_m3 = :water_m3,
                        electricity_kwh = :electricity_kwh,
                        water_charge = :water_charge,
                        electricity_charge = :electricity_charge,
                        service_fee = :service_fee,
                        adjustments = :adjustments,
                        tax = :tax,
                        total_price = :total_price,
                        currency = :currency,
                        status = :status,
                        issued_date = :issued_date,
                        due_date = :due_date,
                        payment_date = :payment_date
                    WHERE billing_id = :billing_id
                """),
                {
                    **bill.model_dump(),
                    "billing_id": billing_id
                }
            )

            conn.commit()

            if result.rowcount == 0:
                raise HTTPException(
                    status_code=404,
                    detail="Bill not found"
                )

            return {
                "success": True,
                "billing_id": billing_id
            }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )