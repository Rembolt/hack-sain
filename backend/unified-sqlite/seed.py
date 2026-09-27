import json

from database import SessionLocal
from database import engine
from security import hash_password

import models

models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

admins = [
    {
        "username": "admin",
        "password": "123456"
    },
]

for admin in admins:

    exists = db.query(
        models.Authorization
    ).filter(
        models.Authorization.username ==
        admin["username"]
    ).first()

    if not exists:

        db.add(
            models.Authorization(
                username=admin["username"],
                password_hash=hash_password(
                    admin["password"]
                )
            )
        )

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