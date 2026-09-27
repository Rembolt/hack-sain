import asyncio
import contextlib
from datetime import datetime, timedelta

from fastapi import Body
from fastapi import FastAPI
from fastapi import Depends
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from security import hash_password, verify_password
from sqlalchemy.orm import Session

from database import SessionLocal
from database import engine

import models
import schemas
import sources

models.Base.metadata.create_all(bind=engine)


def _seconds_until(hhmm: str) -> float:
    hour, minute = (int(part) for part in hhmm.split(":"))
    now = datetime.now()
    target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if target <= now:
        target += timedelta(days=1)
    return (target - now).total_seconds()


def run_nightly_sync() -> dict:
    db = SessionLocal()
    try:
        return sources.sync_sqlite(db)
    finally:
        db.close()


async def _nightly_loop():
    when = sources.nightly_sync_time()
    if not when:
        await asyncio.Event().wait()
        return

    while True:
        await asyncio.sleep(_seconds_until(when))
        try:
            result = await asyncio.to_thread(run_nightly_sync)
            print(f"Nightly SQLite sync imported {result['imported']} rows.")
        except Exception as exc:
            print(f"Nightly SQLite sync failed: {exc}")
        await asyncio.sleep(61)


def _prepare_admins() -> None:
    sources.ensure_profile_columns()
    db = SessionLocal()
    try:
        created = sources.ensure_admins(db)
        if created:
            print(f"Created {created} admin account(s) from the environment.")
    finally:
        db.close()


@contextlib.asynccontextmanager
async def _lifespan(_app: FastAPI):
    _prepare_admins()
    task = asyncio.create_task(_nightly_loop())
    try:
        yield
    finally:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task


app = FastAPI(
    title="Unified SQLite Service",
    lifespan=_lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    users = db.query(
        models.Authorization
    ).all()

    return [_public_user(user) for user in users]


def _public_user(user: models.Authorization) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "name": user.display_name or user.username,
        "email": user.username,
        "title": user.title or "",
        "phone": user.phone or "",
        "is_admin": user.is_admin,
    }


@app.post("/authorization")
def create_user(
    request: schemas.AuthCreate,
    db: Session = Depends(get_db)
):

    existing = (
        db.query(models.Authorization)
        .filter(
            models.Authorization.username
            == request.username
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )

    user = models.Authorization(
        username=request.username,
        password_hash=hash_password(
            request.password
        ),
        is_admin=request.is_admin
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "username": user.username,
        "is_admin": user.is_admin
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

    user = (
        db.query(models.Authorization)
        .filter(
            models.Authorization.username
            == request.username
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    if not verify_password(
        request.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    profile = _public_user(user)
    return {
        "message": "Login successful",
        "username": user.username,
        "is_admin": user.is_admin,
        "name": profile["name"],
        "email": profile["email"],
        "title": profile["title"],
        "phone": profile["phone"],
    }

@app.put("/authorization/{username}/admin")
def update_admin_status(
    username: str,
    is_admin: bool,
    db: Session = Depends(get_db)
):
    user = (
        db.query(models.Authorization)
        .filter(
            models.Authorization.username
            == username
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    user.is_admin = is_admin

    db.commit()
    db.refresh(user)

    return {
        "username": user.username,
        "is_admin": user.is_admin
    }


@app.get("/authorization/{username}")
def get_user(
    username: str,
    db: Session = Depends(get_db)
):
    user = (
        db.query(models.Authorization)
        .filter(models.Authorization.username == username.strip().lower())
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _public_user(user)


@app.put("/authorization/{username}/profile")
def update_profile(
    username: str,
    body: dict = Body(...),
    db: Session = Depends(get_db)
):
    user = (
        db.query(models.Authorization)
        .filter(models.Authorization.username == username.strip().lower())
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    next_email = str(body.get("email") or user.username).strip().lower()
    if next_email != user.username:
        taken = (
            db.query(models.Authorization)
            .filter(models.Authorization.username == next_email)
            .first()
        )
        if taken:
            raise HTTPException(status_code=409, detail="That email is already in use")
        user.username = next_email

    name = str(body.get("name") or "").strip()
    if name:
        user.display_name = name
    if "title" in body:
        user.title = str(body.get("title") or "").strip()
    if "phone" in body:
        user.phone = str(body.get("phone") or "").strip()

    db.commit()
    db.refresh(user)
    return _public_user(user)


def _json(result: sources.ReadResult) -> JSONResponse:
    return JSONResponse(status_code=result.status, content=result.body)


@app.post("/accounts")
def save_account(
    body: dict = Body(...),
    db: Session = Depends(get_db),
):
    return _json(sources.save_app_record(db, "account", body))


@app.post("/complaints")
def save_complaint(
    body: dict = Body(...),
    db: Session = Depends(get_db),
):
    return _json(sources.save_app_record(db, "complaint", body))


@app.post("/files")
def save_file(
    body: dict = Body(...),
    db: Session = Depends(get_db),
):
    return _json(sources.save_app_record(db, "file", body))


@app.post("/service-visits")
def save_service_visit(
    body: dict = Body(...),
    db: Session = Depends(get_db),
):
    return _json(sources.save_app_record(db, "service-visit", body))


@app.get("/accounts/{account_id}")
def read_account(
    account_id: str,
    db: Session = Depends(get_db),
):
    return _json(sources.load_account(db, account_id))


@app.get("/billing/{billing_id}")
def read_billing(
    billing_id: str,
    db: Session = Depends(get_db),
):
    return _json(sources.load_bill(db, billing_id))


@app.get("/complaints")
def read_complaints(
    db: Session = Depends(get_db),
):
    return sources.list_complaints(db)


@app.post("/sync/nightly")
def run_sqlite_sync(
    db: Session = Depends(get_db),
):
    try:
        return sources.sync_sqlite(db)
    except sources.SourceError:
        return JSONResponse(
            status_code=503,
            content={"message": "Complaints source is not reachable."},
        )


@app.get("/sync/nightly")
def read_sqlite_sync(
    db: Session = Depends(get_db),
):
    return sources.sync_status(db)