from pydantic import BaseModel


class AuthCreate(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    id: int
    username: str

    class Config:
        from_attributes = True


class SchemaCreate(BaseModel):
    schema_name: str
    schema_json: str


class SchemaResponse(BaseModel):
    id: int
    schema_name: str
    schema_json: str

    class Config:
        from_attributes = True