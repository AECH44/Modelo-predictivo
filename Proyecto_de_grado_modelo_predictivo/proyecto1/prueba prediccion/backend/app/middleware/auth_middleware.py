"""
Middleware de autenticación para verificar tokens JWT
"""
from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

from ..auth.jwt_handler import decode_access_token
from ..services.auth_service import AuthService

# Security scheme para documentación OpenAPI
security_scheme = HTTPBearer(auto_error=False)


async def verify_token_middleware(request: Request, call_next):
    """
    Middleware global para verificar tokens en requests protegidos.
    Nota: Las rutas protegidas usan dependency injection directamente.
    """
    response = await call_next(request)
    return response


def get_current_user_dependency(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> dict:
    """
    Dependency para obtener el usuario actual desde el token JWT.
    Se usa con Depends() en las rutas protegidas.

    Args:
        credentials: Credenciales del header Authorization (inyectado por FastAPI)

    Returns:
        dict: Información del usuario actual

    Raises:
        HTTPException: Si no hay token o es inválido
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticación no proporcionado",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials
    user = AuthService.get_current_user(token)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticación inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return user


def get_optional_user_dependency(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> Optional[dict]:
    """
    Dependency opcional para obtener el usuario actual.
    Retorna None si no hay token válido en lugar de lanzar error.
    Útil para endpoints que tienen comportamiento diferente según autenticación.

    Args:
        credentials: Credenciales del header Authorization

    Returns:
        dict: Información del usuario o None
    """
    if credentials is None:
        return None

    token = credentials.credentials
    return AuthService.get_current_user(token)


class TokenBearer(HTTPBearer):
    """
    Clase personalizada de HTTPBearer para usar en las rutas.
    Provee mensajes de error más descriptivos.
    """

    def __init__(self, auto_error: bool = True):
        super().__init__(auto_error=auto_error)

    async def __call__(self, request: Request) -> Optional[HTTPAuthorizationCredentials]:
        credentials = await super().__call__(request)

        if credentials:
            if credentials.scheme.lower() != "bearer":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Esquema de autenticación inválido. Use Bearer.",
                    headers={"WWW-Authenticate": "Bearer"}
                )
        return credentials
