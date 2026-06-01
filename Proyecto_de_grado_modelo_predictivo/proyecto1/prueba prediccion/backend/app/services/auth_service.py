"""
Servicio de autenticación con soporte modo demo (sin base de datos)
"""
import logging
from datetime import timedelta, datetime
from typing import Optional, Dict
import threading

logger = logging.getLogger(__name__)

from fastapi import HTTPException, status

from ..auth.jwt_handler import create_access_token, decode_access_token
from ..auth.password_handler import hash_password, verify_password
from ..models.auth_models import UserResponse, LoginResponse

# Almacenamiento en memoria para modo demo
_demo_users: Dict[str, dict] = {}
_demo_lock = threading.Lock()

# Tiempo de expiración del token
TOKEN_EXPIRE_MINUTES = 60

# Bandera para modo demo
_demo_mode = False

# Usuario de prueba predefinido
_DEFAULT_TEST_USER = {
    "email": "demo@unac.edu.co",
    "password": "Demo1234",
    "nombre": "Usuario Demo"
}

def _init_default_user():
    """Inicializa el usuario de prueba por defecto"""
    password_hash = hash_password(_DEFAULT_TEST_USER["password"])
    _demo_users[_DEFAULT_TEST_USER["email"]] = {
        "id": "test_1",
        "email": _DEFAULT_TEST_USER["email"],
        "password_hash": password_hash,
        "nombre": _DEFAULT_TEST_USER["nombre"],
        "created_at": "2024-01-01T00:00:00"
    }
    logger.info(f"Usuario de prueba inicializado: {_DEFAULT_TEST_USER['email']}")


def set_demo_mode(enabled: bool):
    """Activa/desactiva el modo demo"""
    global _demo_mode
    _demo_mode = enabled


class AuthService:
    """Servicio para manejar la autenticación de usuarios"""

    @staticmethod
    def register_user(email: str, password: str, nombre: str) -> LoginResponse:
        """
        Registra un nuevo usuario en el sistema.
        Soporta modo demo (almacenamiento en memoria) si no hay BD.
        """
        logger.info(f"register_user called - _demo_mode={_demo_mode}")
        # Modo demo: almacenamiento en memoria
        if _demo_mode:
            # Inicializar usuario de prueba si es la primera autenticación
            if not _demo_users:
                _init_default_user()
            logger.info("Using demo mode for registration")
            with _demo_lock:
                if email in _demo_users:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="El email ya está registrado"
                    )

                user_id = f"demo_{len(_demo_users) + 1}"
                password_hash = hash_password(password)

                _demo_users[email] = {
                    "id": user_id,
                    "email": email,
                    "password_hash": password_hash,
                    "nombre": nombre,
                    "created_at": datetime.now().isoformat()
                }

            access_token = create_access_token(
                data={"sub": user_id, "email": email},
                expires_delta=timedelta(minutes=TOKEN_EXPIRE_MINUTES)
            )

            return LoginResponse(
                access_token=access_token,
                token_type="bearer",
                user=UserResponse(
                    id=user_id,
                    email=email,
                    nombre=nombre
                )
            )

        # Modo normal: usar base de datos
        try:
            from ..database.connection import fetch_one, execute_with_return

            existing_user = fetch_one(
                "SELECT id FROM usuarios WHERE email = :email",
                {"email": email}
            )

            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El email ya está registrado"
                )

            password_hash = hash_password(password)

            user_id = execute_with_return(
                """
                INSERT INTO usuarios (email, password_hash, nombre)
                VALUES (:email, :password_hash, :nombre)
                RETURNING id
                """,
                {
                    "email": email,
                    "password_hash": password_hash,
                    "nombre": nombre
                }
            )

            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error al crear usuario"
                )

            access_token = create_access_token(
                data={"sub": str(user_id), "email": email},
                expires_delta=timedelta(minutes=TOKEN_EXPIRE_MINUTES)
            )

            return LoginResponse(
                access_token=access_token,
                token_type="bearer",
                user=UserResponse(
                    id=str(user_id),
                    email=email,
                    nombre=nombre
                )
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error en registro: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error en registro: {str(e)}"
            )

    @staticmethod
    def authenticate_user(email: str, password: str) -> LoginResponse:
        """
        Autentica un usuario existente.
        Soporta modo demo (almacenamiento en memoria) si no hay BD.
        """
        # Modo demo: almacenamiento en memoria
        if _demo_mode:
            # Inicializar usuario de prueba si es la primera autenticación
            if not _demo_users:
                _init_default_user()

            logger.info(f"Intentando login con email: {email}")
            logger.info(f"Usuarios en demo mode: {list(_demo_users.keys())}")

            with _demo_lock:
                user = _demo_users.get(email)

            logger.info(f"Usuario encontrado: {user is not None}")
            if user:
                logger.info(f"Hash del usuario: {user['password_hash'][:50]}...")

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Credenciales inválidas",
                    headers={"WWW-Authenticate": "Bearer"}
                )

            try:
                logger.info(f"Verificando password...")
                if not verify_password(password, user["password_hash"]):
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Credenciales inválidas",
                        headers={"WWW-Authenticate": "Bearer"}
                    )
                logger.info("Password verificado correctamente")
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error en verify_password: {type(e).__name__}: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Credenciales inválidas",
                    headers={"WWW-Authenticate": "Bearer"}
                )

            access_token = create_access_token(
                data={"sub": user["id"], "email": email},
                expires_delta=timedelta(minutes=TOKEN_EXPIRE_MINUTES)
            )

            return LoginResponse(
                access_token=access_token,
                token_type="bearer",
                user=UserResponse(
                    id=user["id"],
                    email=email,
                    nombre=user["nombre"]
                )
            )

        # Modo normal: usar base de datos
        try:
            from ..database.connection import fetch_one

            user_data = fetch_one(
                """
                SELECT id, email, password_hash, nombre
                FROM usuarios
                WHERE email = :email
                """,
                {"email": email}
            )

            if not user_data:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Credenciales inválidas",
                    headers={"WWW-Authenticate": "Bearer"}
                )

            user_id, user_email, password_hash, nombre = user_data

            if not verify_password(password, password_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Credenciales inválidas",
                    headers={"WWW-Authenticate": "Bearer"}
                )

            access_token = create_access_token(
                data={"sub": str(user_id), "email": user_email},
                expires_delta=timedelta(minutes=TOKEN_EXPIRE_MINUTES)
            )

            return LoginResponse(
                access_token=access_token,
                token_type="bearer",
                user=UserResponse(
                    id=str(user_id),
                    email=user_email,
                    nombre=nombre
                )
            )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error en login: {str(e)}"
            )

    @staticmethod
    def get_current_user(token: str) -> Optional[dict]:
        """Obtiene la información del usuario actual desde el token."""
        try:
            payload = decode_access_token(token)
            if not payload:
                return None

            user_id = payload.get("sub")
            email = payload.get("email")

            if _demo_mode:
                with _demo_lock:
                    user = _demo_users.get(email)
                if user:
                    return {
                        "id": user["id"],
                        "email": email,
                        "nombre": user["nombre"]
                    }
                return None

            # Modo BD
            from ..database.connection import fetch_one

            user_data = fetch_one(
                """
                SELECT id, email, nombre
                FROM usuarios
                WHERE id = :user_id
                """,
                {"user_id": user_id}
            )

            if not user_data:
                return None

            return {
                "id": str(user_data[0]),
                "email": user_data[1],
                "nombre": user_data[2]
            }

        except Exception:
            return None

    @staticmethod
    def decode_token(token: str) -> Optional[dict]:
        """Decodifica un token JWT."""
        return decode_access_token(token)