"""
Conexión a Base de Datos PostgreSQL para el Sistema Predictor Saber Pro
Soporta modo demo (sin base de datos) cuando PostgreSQL no está disponible.
"""
import os
import logging
from contextlib import contextmanager
from typing import Optional, Generator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

logger = logging.getLogger(__name__)

# ============================================
# CONFIGURACIÓN DE CONEXIÓN
# ============================================

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'saberpro_db')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')

# String de conexión PostgreSQL
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# ============================================
# BANDERA DE MODO DEMO
# ============================================

_db_available = None  # None = no se ha probado aún


def is_db_available() -> bool:
    """Indica si la base de datos está disponible"""
    global _db_available
    return _db_available if _db_available is not None else False


def set_db_available(available: bool):
    """Establece si la base de datos está disponible"""
    global _db_available
    _db_available = available


# ============================================
# ENGINE DE SQLALCHEMY
# ============================================

_engine: Optional[Engine] = None


def get_engine() -> Optional[Engine]:
    """
    Obtiene o crea el engine de SQLAlchemy
    Retorna None si no puede crear el engine.

    Returns:
        Engine o None si no hay conexión
    """
    global _engine

    if _engine is None:
        try:
            _engine = create_engine(
                DATABASE_URL,
                poolclass=NullPool,
                echo=False,
                pool_pre_ping=True,
                connect_args={
                    'connect_timeout': 5,
                    'application_name': 'PredictorSaberPro'
                }
            )
            logger.info(f"Engine de base de datos creado para {DB_HOST}:{DB_PORT}/{DB_NAME}")
        except Exception as e:
            logger.warning(f"No se pudo crear engine de BD: {e}")
            _engine = None

    return _engine


# ============================================
# FUNCIONES DE CONEXIÓN
# ============================================

def test_connection() -> bool:
    """
    Prueba la conexión a la base de datos PostgreSQL

    Returns:
        bool: True si la conexión es exitosa, False en caso contrario
    """
    if is_db_available():
        return True

    try:
        engine = get_engine()
        if engine is None:
            return False

        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1 as test"))
            row = result.fetchone()
            if row and row[0] == 1:
                logger.info("Conexión a PostgreSQL exitosa")
                set_db_available(True)
                return True
        return False
    except Exception as e:
        logger.error(f"Error conectando a PostgreSQL: {e}")
        set_db_available(False)
        return False


def get_connection():
    """
    Obtiene una conexión a la base de datos
    Lanza excepción si no hay conexión.
    """
    engine = get_engine()
    if engine is None:
        raise RuntimeError("Base de datos no disponible")
    return engine.connect()


@contextmanager
def get_db_connection() -> Generator:
    """
    Context manager para obtener conexión con auto-cleanup
    Solo funciona si la base de datos está disponible.
    """
    if not is_db_available():
        yield None
        return

    engine = get_engine()
    if engine is None:
        yield None
        return

    conn = engine.connect()
    try:
        yield conn
    finally:
        conn.close()


# ============================================
# FUNCIONES DE EJECUCIÓN DE QUERIES
# ============================================

def execute_query(query: str, params: dict = None) -> any:
    """
    Ejecuta una query SQL que modifica datos (INSERT, UPDATE, DELETE)

    Args:
        query: SQL query string
        params: Parámetros de la query (opcional)

    Returns:
        Resultado de la query

    Raises:
        Exception: Si hay error en la ejecución o BD no disponible
    """
    if not is_db_available():
        raise RuntimeError("Base de datos no disponible")

    try:
        engine = get_engine()
        if engine is None:
            raise RuntimeError("Base de datos no disponible")
        with engine.connect() as conn:
            result = conn.execute(text(query), params or {})
            conn.commit()
            return result
    except Exception as e:
        logger.error(f"Error ejecutando query: {e}")
        raise


def fetch_one(query: str, params: dict = None) -> Optional[tuple]:
    """
    Obtiene un solo resultado de la query

    Args:
        query: SQL query string
        params: Parámetros de la query (opcional)

    Returns:
        Tupla con el resultado o None si no hay resultados o BD no disponible
    """
    if not is_db_available():
        return None

    try:
        engine = get_engine()
        if engine is None:
            return None
        with engine.connect() as conn:
            result = conn.execute(text(query), params or {})
            return result.fetchone()
    except Exception as e:
        logger.error(f"Error en fetch_one: {e}")
        return None


def fetch_all(query: str, params: dict = None) -> list:
    """
    Obtiene todos los resultados de la query

    Args:
        query: SQL query string
        params: Parámetros de la query (opcional)

    Returns:
        Lista de tuplas con los resultados o lista vacía si BD no disponible
    """
    if not is_db_available():
        return []

    try:
        engine = get_engine()
        if engine is None:
            return []
        with engine.connect() as conn:
            result = conn.execute(text(query), params or {})
            return result.fetchall()
    except Exception as e:
        logger.error(f"Error en fetch_all: {e}")
        return []


def execute_with_return(query: str, params: dict = None) -> Optional[int]:
    """
    Ejecuta una query que retorna un valor (ej: INSERT ... RETURNING id)

    Args:
        query: SQL query string con RETURNING
        params: Parámetros de la query (opcional)

    Returns:
        El valor retornado (ej: id) o None si hay error o BD no disponible
    """
    if not is_db_available():
        return None

    try:
        engine = get_engine()
        if engine is None:
            return None
        with engine.connect() as conn:
            result = conn.execute(text(query), params or {})
            conn.commit()
            logger.info(f"execute_with_return result: {result}")
            logger.info(f"execute_with_return keys: {result.keys() if result else None}")
            row = result.fetchone()
            logger.info(f"execute_with_return row: {row}")
            return row[0] if row else None
    except Exception as e:
        logger.error(f"Error en execute_with_return: {e}", exc_info=True)
        return None


# ============================================
# FUNCIONES DE SCHEMA
# ============================================

def create_usuarios_table() -> bool:
    """
    Crea la tabla de usuarios si no existe.

    Returns:
        bool: True si la tabla se creó o ya existe
    """
    if not is_db_available():
        return False

    try:
        schema = """
        CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            nombre VARCHAR(100),
            created_at TIMESTAMP DEFAULT NOW()
        );
        """

        engine = get_engine()
        if engine is None:
            return False

        with engine.connect() as conn:
            conn.execute(text(schema))
            conn.commit()

        logger.info("Tabla usuarios verificada/creada")
        return True

    except Exception as e:
        logger.error(f"Error creando tabla usuarios: {e}")
        return False


def create_table_if_not_exists() -> bool:
    """
    Crea la tabla principal si no existe

    Returns:
        bool: True si la tabla se creó o ya existe
    """
    if not is_db_available():
        return False

    # Crear tabla de usuarios primero
    create_usuarios_table()

    try:
        schema = """
        CREATE TABLE IF NOT EXISTS resultados_saber_pro (
            id SERIAL PRIMARY KEY,
            documento VARCHAR(20) NOT NULL,
            promedio_acumulado DECIMAL(3,2) NOT NULL,
            promedio_basicas DECIMAL(3,2) NOT NULL,
            promedio_ingenieria DECIMAL(3,2) NOT NULL,
            num_reprobadas INTEGER NOT NULL,
            pct_creditos DECIMAL(5,2) NOT NULL,
            semestre INTEGER NOT NULL,
            estrato INTEGER NOT NULL,
            genero CHAR(1) NOT NULL,
            resultado VARCHAR(10) NOT NULL,
            probabilidad DECIMAL(5,4) NOT NULL,
            confidence_pct DECIMAL(5,2) NOT NULL,
            recomendacion TEXT,
            model_version VARCHAR(20) DEFAULT '1.0.0',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_resultados_documento ON resultados_saber_pro(documento);
        CREATE INDEX IF NOT EXISTS idx_resultados_fecha ON resultados_saber_pro(created_at);
        CREATE INDEX IF NOT EXISTS idx_resultados_resultado ON resultados_saber_pro(resultado);
        """

        engine = get_engine()
        if engine is None:
            return False

        with engine.connect() as conn:
            for statement in schema.split(';'):
                if statement.strip():
                    conn.execute(text(statement))
            conn.commit()

        logger.info("Tabla resultados_saber_pro verificada/creada")
        return True

    except Exception as e:
        logger.error(f"Error creando tabla: {e}")
        return False


# ============================================
# LIMPIEZA DE RECURSOS
# ============================================

def close_engine():
    """Cierra el engine de forma segura"""
    global _engine
    if _engine is not None:
        _engine.dispose()
        _engine = None
        logger.info("Engine de base de datos cerrado")