# test connection to the SQLite database and retrieve data from the complaints table
from sqlalchemy import create_engine, text

engine = create_engine("sqlite:///utility.db")

with engine.connect() as conn:

    results = conn.execute(
        text("SELECT * FROM complaints")
    )

    for row in results:
        print(dict(row._mapping))