from pydantic import BaseModel


class AuthCreate(BaseModel):
    username: str
    password: str
    is_admin: bool = False


class AuthResponse(BaseModel):
    id: int
    username: str
    is_admin: bool

    class Config:
        from_attributes = True

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