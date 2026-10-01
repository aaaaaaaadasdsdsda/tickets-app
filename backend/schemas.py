from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class LoginRequest(BaseModel):
    username: str
    password: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class UserOut(BaseModel):
    id: int
    username: str
    nombre: str
    role: str
    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    username: str
    password: str
    nombre: str
    role: str

class UserUpdate(BaseModel):
    nombre: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class RecordBase(BaseModel):
    fecha: str
    local: str
    tipo: str
    detalle: str
    total: float
    iva: Optional[float] = None
    condicion: Optional[str] = None
    rut_emisor: Optional[str] = None
    rut_comprador: Optional[str] = None
    notas: Optional[str] = None

class RecordCreate(RecordBase):
    pass

class RecordUpdate(RecordBase):
    pass

class RecordPatch(BaseModel):
    fecha: Optional[str] = None
    local: Optional[str] = None
    tipo: Optional[str] = None
    detalle: Optional[str] = None
    total: Optional[float] = None
    iva: Optional[float] = None
    condicion: Optional[str] = None
    rut_emisor: Optional[str] = None
    rut_comprador: Optional[str] = None
    notas: Optional[str] = None

class RecordOut(RecordBase):
    id: int
    creado: Optional[datetime] = None
    attachment: Optional[str] = None
    attachment_name: Optional[str] = None
    class Config:
        from_attributes = True

class BudgetBase(BaseModel):
    categoria: str
    monto_mensual: float
    activo: int = 1

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    monto_mensual: Optional[float] = None
    activo: Optional[int] = None

class BudgetOut(BudgetBase):
    id: int
    creado: Optional[datetime] = None
    class Config:
        from_attributes = True

class ChangeLogOut(BaseModel):
    id: int
    record_id: Optional[int] = None
    user_id: Optional[int] = None
    user_nombre: Optional[str] = None
    accion: str
    detalle_antes: Optional[str] = None
    detalle_despues: Optional[str] = None
    creado: Optional[datetime] = None
    class Config:
        from_attributes = True