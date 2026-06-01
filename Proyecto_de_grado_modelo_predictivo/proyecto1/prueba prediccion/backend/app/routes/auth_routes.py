"""
Rutas API para autenticación
"""
from fastapi import APIRouter, HTTPException, Depends, status
import logging

from ..models.auth_models import (
    UserRegister,
    UserLogin,
    UserResponse,
    LoginResponse
)
from ..services.auth_service import AuthService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["autenticación"])


@router.post(
    "/register",
    response_model=LoginResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar nuevo usuario",
    description="Registra un nuevo usuario en el sistema y retorna un token JWT"
)
async def register(user_data: UserRegister):
    """
    Registra un nuevo usuario en el sistema.

    Parámetros:
    - **email**: Correo electrónico único del usuario
    - **password**: Contraseña del usuario (mínimo 6 caracteres)
    - **nombre**: Nombre del usuario

    Retorna:
    - **access_token**: Token JWT de acceso
    - **token_type**: Tipo de token (bearer)
    - **user**: Información del usuario registrado
    """
    try:
        result = AuthService.register_user(
            email=user_data.email,
            password=user_data.password,
            nombre=user_data.nombre
        )

        logger.info(f"Nuevo usuario registrado: {user_data.email}")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en registro: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error procesando registro: {str(e)}"
        )


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Iniciar sesión",
    description="Autentica un usuario y retorna un token JWT"
)
async def login(credentials: UserLogin):
    """
    Autentica un usuario y retorna un token JWT.

    Parámetros:
    - **email**: Correo electrónico del usuario
    - **password**: Contraseña del usuario

    Retorna:
    - **access_token**: Token JWT de acceso
    - **token_type**: Tipo de token (bearer)
    - **user**: Información del usuario autenticado
    """
    try:
        result = AuthService.authenticate_user(
            email=credentials.email,
            password=credentials.password
        )

        logger.info(f"Login exitoso para: {credentials.email}")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error procesando login: {str(e)}"
        )
