"""
Conexión a PostgreSQL para el servicio ML.

Lee credenciales del `.env` del backend (DB_HOST, DB_PORT, DB_NAME, DB_USER,
DB_PASSWORD) usando una función helper, con fallback a variables de entorno.

Funciones exportadas:
- execute_query(sql, params=None): ejecuta INSERT/UPDATE/DELETE
- fetch_one(sql, params=None):   retorna una fila (dict) o None
- fetch_all(sql, params=None):   retorna lista de filas (dict)
- test_connection() -> bool:     verifica conexión a la BD
- get_connection():              retorna conexión psycopg2 (con caché)
- set_db_available(bool):        marca si la BD está disponible
"""

from __future__ import annotations

import os
from threading import Lock
from typing import Any, Optional
from pathlib import Path

try:
    import psycopg2
    import psycopg2.extras
    _HAS_PSYCOPG2 = True
except ImportError:
    _HAS_PSYCOPG2 = False


# Estado de la BD
_db_available: bool = False
_db_lock = Lock()


def _load_env_from_backend() -> None:
    """Intenta cargar el `.env` del backend si las vars no están en el entorno."""
    if all(os.getenv(k) for k in ('DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD')):
        return  # ya están en el entorno

    try:
        from dotenv import load_dotenv
        candidates = [
            Path(__file__).resolve().parents[3] / 'backend' / '.env',
            Path(__file__).resolve().parents[2] / '.env',
        ]
        for env_path in candidates:
            if env_path.exists():
                load_dotenv(env_path)
                return
    except ImportError:
        pass


_load_env_from_backend()


def _conn_params() -> dict:
    return {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', '5432')),
        'dbname': os.getenv('DB_NAME', 'saberpro'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', ''),
    }


def _open_connection():
    if not _HAS_PSYCOPG2:
        raise RuntimeError(
            'psycopg2-binary no instalado. Ejecuta: pip install psycopg2-binary'
        )
    return psycopg2.connect(**_conn_params())


def get_connection():
    """Retorna una conexión psycopg2 nueva."""
    return _open_connection()


def test_connection() -> bool:
    """Intenta conectar. Retorna True si tiene éxito, False en caso contrario."""
    try:
        conn = _open_connection()
        conn.close()
        return True
    except Exception:
        return False


def set_db_available(available: bool) -> None:
    """Marca si la BD está disponible (global, leído por otros módulos)."""
    global _db_available
    with _db_lock:
        _db_available = bool(available)


def is_db_available() -> bool:
    with _db_lock:
        return _db_available


def execute_query(sql: str, params: Optional[dict] = None) -> None:
    """Ejecuta INSERT/UPDATE/DELETE. Hace commit automático."""
    conn = _open_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
        conn.commit()
    finally:
        conn.close()


def fetch_one(sql: str, params: Optional[dict] = None) -> Optional[dict]:
    """Retorna una fila como dict, o None si no hay resultados."""
    conn = _open_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()


def fetch_all(sql: str, params: Optional[dict] = None) -> list[dict]:
    """Retorna todas las filas como lista de dicts."""
    conn = _open_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()