from fastapi import FastAPI
from fastapi import Depends
from fastapi import HTTPException
from security import hash_password, verify_password
from sqlalchemy.orm import Session

from database import SessionLocal
from database import engine

import models
import schemas

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Unified SQLite Service"
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()

@app.get("/authorization")
def get_all_users(
    db: Session = Depends(get_db)
):
    return db.query(
        models.Authorization
    ).all()


@app.post("/authorization")
def create_user(
    request: schemas.AuthCreate,
    db: Session = Depends(get_db)
):

    existing = db.query(
        models.Authorization
    ).filter(
        models.Authorization.username ==
        request.username
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )

    user = models.Authorization(
        username=request.username,
        password_hash=hash_password(
            request.password
        )
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "username": user.username
    }

@app.get("/schemas")
def get_schemas(
    db: Session = Depends(get_db)
):
    return db.query(
        models.SchemaTemplate
    ).all()


@app.get("/schemas/{schema_name}")
def get_schema(
    schema_name: str,
    db: Session = Depends(get_db)
):
    schema = db.query(
        models.SchemaTemplate
    ).filter(
        models.SchemaTemplate.schema_name ==
        schema_name
    ).first()

    if not schema:
        raise HTTPException(
            status_code=404,
            detail="Schema not found"
        )

    return schema


@app.post("/schemas")
def create_schema(
    request: schemas.SchemaCreate,
    db: Session = Depends(get_db)
):
    schema = models.SchemaTemplate(
        schema_name=request.schema_name,
        schema_json=request.schema_json
    )

    db.add(schema)
    db.commit()
    db.refresh(schema)

    return

@app.post("/login")
def login(
    request: schemas.AuthCreate,
    db: Session = Depends(get_db)
):

    user = db.query(
        models.Authorization
    ).filter(
        models.Authorization.username ==
        request.username
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    valid = verify_password(
        request.password,
        user.password_hash
    )

    if not valid:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    return {
        "message": "Login successful",
        "username": user.username
    }