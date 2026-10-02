import os
import json
import time
import shutil
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, FileResponse
from sqlalchemy.orm import Session
from typing import List
from database import Base, engine, get_db
from models import User, Record, Budget, ChangeLog
from schemas import (
    LoginRequest, TokenResponse, UserOut,
    UserCreate, UserUpdate, PasswordChange,
    RecordCreate, RecordUpdate, RecordPatch, RecordOut,
    BudgetCreate, BudgetUpdate, BudgetOut,
    ChangeLogOut,
)
import auth

Base.metadata.create_all(bind=engine)

UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="Tickets API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Helper: log de cambios ----------
def log_change(db, user, accion, record_id, antes=None, despues=None):
    log = ChangeLog(
        record_id=record_id,
        user_id=user.id if user else None,
        user_nombre=user.nombre if user else None,
        accion=accion,
        detalle_antes=json.dumps(antes, ensure_ascii=False, default=str) if antes else None,
        detalle_despues=json.dumps(despues, ensure_ascii=False, default=str) if despues else None,
    )
    db.add(log)

def record_to_dict(r):
    return {
        "fecha": r.fecha, "local": r.local, "tipo": r.tipo,
        "detalle": r.detalle, "total": r.total, "iva": r.iva,
        "moneda": r.moneda,
        "condicion": r.condicion,
        "rut_emisor": r.rut_emisor,
        "rut_comprador": r.rut_comprador,
        "notas": r.notas,
    }

# ---------- AUTH ----------
@app.post("/auth/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not auth.verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    return {"access_token": auth.create_token(user.id), "user": user}

@app.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(auth.get_current_user)):
    return user

@app.post("/auth/change-password")
def change_password(data: PasswordChange, db: Session = Depends(get_db), user: User = Depends(auth.get_current_user)):
    if not auth.verify_password(data.current_password, user.password_hash):
        raise HTTPException(400, "La contraseña actual no es correcta")
    if len(data.new_password) < 4:
        raise HTTPException(400, "La nueva contraseña debe tener al menos 4 caracteres")
    user.password_hash = auth.hash_password(data.new_password)
    db.commit()
    return {"ok": True}

# ---------- USUARIOS ----------
ROLES_VALIDOS = ("programador", "administrador", "trabajador")

@app.get("/users", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), user: User = Depends(auth.require_editor)):
    return db.query(User).order_by(User.id).all()

@app.post("/users", response_model=UserOut)
def create_user(data: UserCreate, db: Session = Depends(get_db), user: User = Depends(auth.require_editor)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(400, "Ese nombre de usuario ya existe")
    if data.role not in ROLES_VALIDOS:
        raise HTTPException(400, "Rol inválido")
    if len(data.password) < 4:
        raise HTTPException(400, "La contraseña debe tener al menos 4 caracteres")
    u = User(
        username=data.username,
        password_hash=auth.hash_password(data.password),
        nombre=data.nombre,
        role=data.role,
    )
    db.add(u); db.commit(); db.refresh(u)
    return u

@app.put("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db), user: User = Depends(auth.require_editor)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "Usuario no encontrado")
    if data.nombre is not None:
        u.nombre = data.nombre
    if data.role is not None:
        if data.role not in ROLES_VALIDOS:
            raise HTTPException(400, "Rol inválido")
        u.role = data.role
    if data.password:
        if len(data.password) < 4:
            raise HTTPException(400, "La contraseña debe tener al menos 4 caracteres")
        u.password_hash = auth.hash_password(data.password)
    db.commit(); db.refresh(u)
    return u

@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), user: User = Depends(auth.require_editor)):
    if user.id == user_id:
        raise HTTPException(400, "No podés eliminar tu propio usuario")
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "Usuario no encontrado")
    db.delete(u); db.commit()
    return {"ok": True}

# ---------- REGISTROS ----------
@app.get("/records", response_model=List[RecordOut])
def list_records(db: Session = Depends(get_db), user: User = Depends(auth.get_current_user)):
    return db.query(Record).order_by(Record.creado.desc()).all()

@app.post("/records", response_model=RecordOut)
def create_record(data: RecordCreate, db: Session = Depends(get_db), user: User = Depends(auth.get_current_user)):
    payload = data.model_dump()
    if not payload.get("moneda"):
        payload["moneda"] = "UYU"
    rec = Record(**payload, creado_por=user.id)
    db.add(rec); db.commit(); db.refresh(rec)
    log_change(db, user, "creado", rec.id, despues=record_to_dict(rec))
    db.commit()
    return rec

@app.put("/records/{record_id}", response_model=RecordOut)
def update_record(record_id: int, data: RecordUpdate, db: Session = Depends(get_db), user: User = Depends(auth.require_editor)):
    rec = db.query(Record).filter(Record.id == record_id).first()
    if not rec:
        raise HTTPException(404, "No encontrado")
    antes = record_to_dict(rec)
    for k, v in data.model_dump().items():
        setattr(rec, k, v)
    db.commit(); db.refresh(rec)
    log_change(db, user, "editado", rec.id, antes=antes, despues=record_to_dict(rec))
    db.commit()
    return rec

@app.patch("/records/{record_id}", response_model=RecordOut)
def patch_record(record_id: int, data: RecordPatch, db: Session = Depends(get_db), user: User = Depends(auth.require_editor)):
    rec = db.query(Record).filter(Record.id == record_id).first()
    if not rec:
        raise HTTPException(404, "No encontrado")
    antes = record_to_dict(rec)
    cambios = data.model_dump(exclude_unset=True)
    for k, v in cambios.items():
        setattr(rec, k, v)
    db.commit(); db.refresh(rec)
    log_change(db, user, "editado", rec.id, antes=antes, despues=record_to_dict(rec))
    db.commit()
    return rec

@app.delete("/records/{record_id}")
def delete_record(record_id: int, db: Session = Depends(get_db), user: User = Depends(auth.require_editor)):
    rec = db.query(Record).filter(Record.id == record_id).first()
    if not rec:
        raise HTTPException(404, "No encontrado")
    if rec.attachment:
        p = os.path.join(UPLOAD_DIR, rec.attachment)
        if os.path.exists(p):
            try: os.remove(p)
            except: pass
    antes = record_to_dict(rec)
    db.delete(rec)
    log_change(db, user, "eliminado", record_id, antes=antes)
    db.commit()
    return {"ok": True}

# ---------- ADJUNTOS (Cloudflare R2 con fallback a disco) ----------
import boto3
from botocore.client import Config

R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID")
R2_ACCESS_KEY = os.environ.get("R2_ACCESS_KEY")
R2_SECRET_KEY = os.environ.get("R2_SECRET_KEY")
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME", "flor")

s3_client = None
if R2_ACCOUNT_ID and R2_ACCESS_KEY and R2_SECRET_KEY:
    try:
        s3_client = boto3.client(
            service_name="s3",
            endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=R2_ACCESS_KEY,
            aws_secret_access_key=R2_SECRET_KEY,
            region_name="auto",
            config=Config(signature_version="s3v4"),
        )
        print("R2 configurado correctamente.")
    except Exception as e:
        print(f"ERROR configurando R2: {e}")
        s3_client = None
else:
    print("R2 no configurado. Los adjuntos se guardarán en disco local.")

EXT_PERMITIDAS = {'.png', '.jpg', '.jpeg', '.pdf', '.webp', '.gif'}

@app.post("/records/{record_id}/attachment")
async def upload_attachment(record_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(auth.get_current_user)):
    rec = db.query(Record).filter(Record.id == record_id).first()
    if not rec:
        raise HTTPException(404, "Registro no encontrado")

    ext = os.path.splitext(file.filename or '')[1].lower()
    if ext not in EXT_PERMITIDAS:
        raise HTTPException(400, f"Formato no permitido. Usá: {', '.join(sorted(EXT_PERMITIDAS))}")

    safe_name = f"rec_{record_id}_{int(time.time())}{ext}"

    if s3_client:
        if rec.attachment:
            try:
                s3_client.delete_object(Bucket=R2_BUCKET_NAME, Key=rec.attachment)
            except Exception as e:
                print(f"No se pudo borrar adjunto viejo de R2: {e}")

        try:
            s3_client.upload_fileobj(
                file.file,
                R2_BUCKET_NAME,
                safe_name,
                ExtraArgs={'ContentType': file.content_type or 'application/octet-stream'}
            )
        except Exception as e:
            raise HTTPException(500, f"Error al subir a R2: {str(e)}")
    else:
        if rec.attachment:
            old = os.path.join(UPLOAD_DIR, rec.attachment)
            if os.path.exists(old):
                try: os.remove(old)
                except: pass
        file_path = os.path.join(UPLOAD_DIR, safe_name)
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

    rec.attachment = safe_name
    rec.attachment_name = file.filename
    db.commit(); db.refresh(rec)
    return {"ok": True, "attachment": rec.attachment, "attachment_name": rec.attachment_name}

@app.delete("/records/{record_id}/attachment")
def delete_attachment(record_id: int, db: Session = Depends(get_db), user: User = Depends(auth.require_editor)):
    rec = db.query(Record).filter(Record.id == record_id).first()
    if not rec:
        raise HTTPException(404, "Registro no encontrado")
    if rec.attachment:
        if s3_client:
            try:
                s3_client.delete_object(Bucket=R2_BUCKET_NAME, Key=rec.attachment)
            except Exception as e:
                print(f"No se pudo borrar de R2: {e}")
        else:
            p = os.path.join(UPLOAD_DIR, rec.attachment)
            if os.path.exists(p):
                try: os.remove(p)
                except: pass
        rec.attachment = None
        rec.attachment_name = None
        db.commit()
    return {"ok": True}

@app.get("/uploads/{filename}")
def get_upload(filename: str):
    if s3_client:
        try:
            url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': R2_BUCKET_NAME, 'Key': filename},
                ExpiresIn=3600
            )
            return RedirectResponse(url=url)
        except Exception as e:
            raise HTTPException(500, f"Error generando URL: {str(e)}")
    else:
        file_path = os.path.join(UPLOAD_DIR, filename)
        if not os.path.exists(file_path):
            raise HTTPException(404, "Archivo no encontrado")
        return FileResponse(file_path)

# ---------- PRESUPUESTOS ----------
@app.get("/budgets", response_model=List[BudgetOut])
def list_budgets(db: Session = Depends(get_db), user: User = Depends(auth.get_current_user)):
    return db.query(Budget).order_by(Budget.categoria).all()

@app.post("/budgets", response_model=BudgetOut)
def create_budget(data: BudgetCreate, db: Session = Depends(get_db), user: User = Depends(auth.require_editor)):
    if data.monto_mensual <= 0:
        raise HTTPException(400, "El monto debe ser mayor a 0")
    if db.query(Budget).filter(Budget.categoria == data.categoria).first():
        raise HTTPException(400, "Ya existe un presupuesto para esa categoría")
    b = Budget(**data.model_dump())
    db.add(b); db.commit(); db.refresh(b)
    return b

@app.put("/budgets/{budget_id}", response_model=BudgetOut)
def update_budget(budget_id: int, data: BudgetUpdate, db: Session = Depends(get_db), user: User = Depends(auth.require_editor)):
    b = db.query(Budget).filter(Budget.id == budget_id).first()
    if not b:
        raise HTTPException(404, "Presupuesto no encontrado")
    if data.monto_mensual is not None:
        if data.monto_mensual <= 0:
            raise HTTPException(400, "El monto debe ser mayor a 0")
        b.monto_mensual = data.monto_mensual
    if data.activo is not None:
        b.activo = data.activo
    db.commit(); db.refresh(b)
    return b

@app.delete("/budgets/{budget_id}")
def delete_budget(budget_id: int, db: Session = Depends(get_db), user: User = Depends(auth.require_editor)):
    b = db.query(Budget).filter(Budget.id == budget_id).first()
    if not b:
        raise HTTPException(404, "Presupuesto no encontrado")
    db.delete(b); db.commit()
    return {"ok": True}

# ---------- HISTORIAL DE CAMBIOS ----------
@app.get("/changelog", response_model=List[ChangeLogOut])
def list_changelog(limit: int = 200, db: Session = Depends(get_db), user: User = Depends(auth.get_current_user)):
    return db.query(ChangeLog).order_by(ChangeLog.creado.desc()).limit(limit).all()

# Servir el frontend (SIEMPRE al final)
app.mount("/", StaticFiles(directory="static", html=True), name="static")