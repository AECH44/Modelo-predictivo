"""
Gestor de tokens JWT para autenticación
"""
import os
from datetime import datetime, timedelta
from typing import Optional

import jwt
from dotenv import load_dotenv

load_dotenv()

# Configuración
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Genera un token JWT con los datos proporcionados.

    Args:
        data: Diccionario con los datos a codificar en el token
        expires_delta: Tiempo de expiración del token (default: 60 minutos)

    Returns:
        str: Token JWT codificado
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decodifica y valida un token JWT.

    Args:
        token: Token JWT a decodificar

    Returns:
        dict: Datos decodificados del token o None si es inválido
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        # Token ha expirado
        return None
    except jwt.InvalidTokenError:
        # Token inválido
        return None


def verify_token(token: str) -> bool:
    """
    Verifica si un token JWT es válido.

    Args:
        token: Token JWT a verificar

    Returns:
        bool: True si el token es válido, False en caso contrario
    """
    payload = decode_access_token(token)
    return payload is not None
