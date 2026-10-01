import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# En producción (Render) se lee DATABASE_URL del entorno.
# En local, si no está definida, usamos SQLite.
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./tickets.db")

# Render provee URLs que empiezan con "postgres://" pero SQLAlchemy
# 2.x espera "postgresql://". Convertimos si hace falta.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Los args de SQLite no aplican a Postgres
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()