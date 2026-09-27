from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import Boolean
from sqlalchemy import UniqueConstraint

from database import Base


class Authorization(Base):
    __tablename__ = "authorization"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(
        String,
        unique=True,
        nullable=False
    )

    password_hash = Column(
        String,
        nullable=False
    )

    is_admin = Column(
        Boolean,
        nullable=False,
        default=False
    )

    display_name = Column(String, nullable=False, default="")

    title = Column(String, nullable=False, default="")

    phone = Column(String, nullable=False, default="")



class SchemaTemplate(Base):
    __tablename__ = "schemas"

    id = Column(Integer, primary_key=True, index=True)

    schema_name = Column(
        String,
        unique=True,
        nullable=False
    )

    schema_json = Column(
        Text,
        nullable=False
    )


class StoredRecord(Base):
    __tablename__ = "stored_records"
    __table_args__ = (
        UniqueConstraint(
            "kind",
            "record_key",
            name="uq_stored_kind_key",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    kind = Column(String, nullable=False, index=True)

    record_key = Column(String, nullable=False)

    account_id = Column(String, nullable=True, index=True)

    payload = Column(Text, nullable=False)

    origin = Column(String, nullable=False)

    updated_at = Column(String, nullable=False)


class SyncState(Base):
    __tablename__ = "sync_state"

    source = Column(String, primary_key=True)

    cursor = Column(String, nullable=False, default="")

    last_run_at = Column(String, nullable=True)

    last_imported = Column(Integer, nullable=False, default=0)