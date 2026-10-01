"""
Backup automático de la base SQLite.
Uso:
    python backup.py               # hace un backup con timestamp
    python backup.py --keep 30     # mantiene solo los últimos 30 backups
"""
import os
import shutil
import sqlite3
import argparse
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'tickets.db')
BACKUP_DIR = os.path.join(BASE_DIR, 'backups')
UPLOAD_DIR = os.path.join(BASE_DIR, 'static', 'uploads')


def hacer_backup(keep=50):
    if not os.path.exists(DB_PATH):
        print(f'ERROR: no existe {DB_PATH}')
        return

    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

    # Copia consistente usando la API de backup de SQLite
    # (funciona aunque la DB esté abierta por uvicorn)
    destino = os.path.join(BACKUP_DIR, f'tickets_{timestamp}.db')
    src = sqlite3.connect(DB_PATH)
    dst = sqlite3.connect(destino)
    with dst:
        src.backup(dst)
    dst.close()
    src.close()

    size_kb = os.path.getsize(destino) / 1024
    print(f'Backup creado: {os.path.basename(destino)} ({size_kb:.1f} KB)')

    # Backup de adjuntos (opcional, uno por día)
    if os.path.exists(UPLOAD_DIR) and os.listdir(UPLOAD_DIR):
        dia = datetime.now().strftime('%Y%m%d')
        zip_adjuntos = os.path.join(BACKUP_DIR, f'uploads_{dia}.zip')
        if not os.path.exists(zip_adjuntos):
            import zipfile
            with zipfile.ZipFile(zip_adjuntos, 'w', zipfile.ZIP_DEFLATED) as zf:
                for f in os.listdir(UPLOAD_DIR):
                    ruta = os.path.join(UPLOAD_DIR, f)
                    if os.path.isfile(ruta):
                        zf.write(ruta, f)
            print(f'Adjuntos respaldados: uploads_{dia}.zip')

    # Limpieza de backups viejos
    backups = sorted([
        f for f in os.listdir(BACKUP_DIR)
        if f.startswith('tickets_') and f.endswith('.db')
    ])
    if len(backups) > keep:
        a_borrar = backups[:-keep]
        for f in a_borrar:
            try:
                os.remove(os.path.join(BACKUP_DIR, f))
                print(f'Eliminado backup viejo: {f}')
            except Exception as e:
                print(f'No se pudo borrar {f}: {e}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--keep', type=int, default=50,
                        help='Cuántos backups conservar (default 50)')
    args = parser.parse_args()
    hacer_backup(keep=args.keep)