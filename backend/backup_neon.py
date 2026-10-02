"""
Backup de la base de datos Neon (PostgreSQL).
Uso:
    python backup_neon.py
    python backup_neon.py --keep 30
"""
import os
import subprocess
import argparse
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKUP_DIR = os.path.join(BASE_DIR, 'backups', 'neon')

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL no está definida en el .env")
    exit(1)

# Limpiar la URL para pg_dump (quitar +psycopg2 y channel_binding)
URL_PG_DUMP = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://")
# pg_dump puede tener problemas con channel_binding, lo sacamos
if "&channel_binding=require" in URL_PG_DUMP:
    URL_PG_DUMP = URL_PG_DUMP.replace("&channel_binding=require", "")
if "?channel_binding=require&" in URL_PG_DUMP:
    URL_PG_DUMP = URL_PG_DUMP.replace("?channel_binding=require&", "?")


def hacer_backup(keep_days=30):
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR, exist_ok=True)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    destino = os.path.join(BACKUP_DIR, f'neon_backup_{timestamp}.sql')

    print(f'Iniciando backup...')
    print(f'Destino: {destino}')

    try:
        result = subprocess.run(
            ['pg_dump', URL_PG_DUMP, '--no-owner', '--no-acl', '-f', destino],
            capture_output=True,
            text=True,
            timeout=300
        )
        if result.returncode != 0:
            print(f'ERROR: pg_dump falló con código {result.returncode}')
            print(f'stderr: {result.stderr}')
            return

        size_kb = os.path.getsize(destino) / 1024
        print(f'Backup creado: {os.path.basename(destino)} ({size_kb:.1f} KB)')

    except FileNotFoundError:
        print('ERROR: pg_dump no está instalado o no está en el PATH.')
        return
    except Exception as e:
        print(f'ERROR: {e}')
        return

    # Limpieza de backups viejos
    limite = datetime.now() - timedelta(days=keep_days)
    eliminados = 0
    for f in os.listdir(BACKUP_DIR):
        if not (f.startswith('neon_backup_') and f.endswith('.sql')):
            continue
        ruta = os.path.join(BACKUP_DIR, f)
        try:
            fecha_str = f.replace('neon_backup_', '').replace('.sql', '')
            fecha = datetime.strptime(fecha_str, '%Y%m%d_%H%M%S')
            if fecha < limite:
                os.remove(ruta)
                eliminados += 1
        except Exception:
            pass

    if eliminados:
        print(f'Eliminados {eliminados} backups con más de {keep_days} días.')
    print('Backup completo.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--keep', type=int, default=30,
                        help='Días de retención (default 30)')
    args = parser.parse_args()
    hacer_backup(keep_days=args.keep)