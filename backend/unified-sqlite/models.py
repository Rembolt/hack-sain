from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text

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