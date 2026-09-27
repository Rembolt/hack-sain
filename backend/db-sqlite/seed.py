# This script seeds the SQLite database with initial complaint data.

from sqlalchemy import create_engine, text

engine = create_engine("sqlite:///utility.db")

with engine.connect() as conn:

    conn.execute(
        text("""
            INSERT INTO complaints (
                complaint_id,
                ticket_number,
                account_id,
                reason,
                category,
                description,
                priority,
                status,
                assigned_to
            )
            VALUES
            (
                'COMP-002',
                'TKT-002',
                'ACC-100002',
                'Power Outage',
                'Service',
                'Customer reported power outage in neighborhood.',
                'High',
                'Open',
                'Jane Doe'
            ),
            (
                'COMP-003',
                'TKT-003',
                'ACC-100003',
                'High Water Bill',
                'Billing',
                'Customer believes water charges are incorrect.',
                'Medium',
                'In Progress',
                'John Williams'
            ),
            (
                'COMP-004',
                'TKT-004',
                'ACC-100004',
                'Meter Reading Error',
                'Meter',
                'Customer reports unexpected meter reading spike.',
                'Low',
                'Closed',
                'Sarah Johnson'
            )
        """)
    )

    conn.commit()

print("Seed data inserted successfully.")