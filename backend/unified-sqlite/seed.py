import json

from database import SessionLocal
from database import engine

import models

models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

complaint_schema = {
    "complaintId": "",
    "customerId": "",
    "status": "",
    "priority": "",
    "createdDate": "",
    "closedDate": ""
}

db.add(
    models.SchemaTemplate(
        schema_name="Complaint",
        schema_json=json.dumps(
            complaint_schema,
            indent=2
        )
    )
)

billing_schema = {
    "billingId": "",
    "customerId": "",
    "amountDue": 0.0,
    "dueDate": ""
}

db.add(
    models.SchemaTemplate(
        schema_name="Billing",
        schema_json=json.dumps(
            billing_schema,
            indent=2
        )
    )
)

db.commit()
db.close()

print("Unified database seeded.")