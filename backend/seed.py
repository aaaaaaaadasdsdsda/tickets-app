from database import SessionLocal, Base, engine
from models import User
import auth

Base.metadata.create_all(bind=engine)

USUARIOS = [
    {"username": "axel",       "password": "cambiar123", "role": "programador",   "nombre": "Axel"},
    {"username": "admin",      "password": "cambiar123", "role": "administrador", "nombre": "Administrador"},
    {"username": "trabajador", "password": "cambiar123", "role": "trabajador",    "nombre": "Trabajador"},
    {"username": "flor",       "password": "123",        "role": "administrador", "nombre": "Flor"},
]

db = SessionLocal()
for u in USUARIOS:
    exists = db.query(User).filter(User.username == u["username"]).first()
    if not exists:
        db.add(User(
            username=u["username"],
            password_hash=auth.hash_password(u["password"]),
            role=u["role"],
            nombre=u["nombre"],
        ))
        print(f"Usuario '{u['username']}' creado.")
    else:
        print(f"Usuario '{u['username']}' ya existe, se omite.")
db.commit()
db.close()
print("Listo.")