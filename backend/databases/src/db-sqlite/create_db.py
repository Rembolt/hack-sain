# Create the SQLite database and the complaints table

from sqlalchemy import create_engine, text

engine = create_engine("sqlite:///utility.db")

with engine.connect() as conn:

    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS complaints (
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

    conn.commit()

print("Database created!")