from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    nombre = Column(String, nullable=False)
    role = Column(String, nullable=False)

class Record(Base):
    __tablename__ = "records"
    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(String, nullable=False)
    local = Column(String, nullable=False)
    tipo = Column(String, nullable=False)
    detalle = Column(String, nullable=False)
    total = Column(Float, nullable=False)
    iva = Column(Float, nullable=True)
    moneda = Column(String, nullable=True, default='UYU')
    condicion = Column(String, nullable=True)
    rut_emisor = Column(String, nullable=True)
    rut_comprador = Column(String, nullable=True)
    notas = Column(Text, nullable=True)
    creado = Column(DateTime, default=datetime.utcnow)
    creado_por = Column(Integer, nullable=True)
    attachment = Column(String, nullable=True)
    attachment_name = Column(String, nullable=True)

class Budget(Base):
    __tablename__ = "budgets"
    id = Column(Integer, primary_key=True, index=True)
    categoria = Column(String, nullable=False, unique=True)
    monto_mensual = Column(Float, nullable=False)
    activo = Column(Integer, default=1)
    creado = Column(DateTime, default=datetime.utcnow)

class ChangeLog(Base):
    __tablename__ = "changelog"
    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, nullable=True)
    user_id = Column(Integer, nullable=True)
    user_nombre = Column(String, nullable=True)
    accion = Column(String, nullable=False)
    detalle_antes = Column(String, nullable=True)
    detalle_despues = Column(String, nullable=True)
    creado = Column(DateTime, default=datetime.utcnow)

