"""
Gestor de contraseñas usando hashlib puro (sin passlib)
"""
import hashlib
import secrets


def hash_password(password: str) -> str:
    """
    Genera el hash de una contraseña usando SHA-256 con salt.

    Args:
        password: Contraseña en texto plano

    Returns:
        str: Hash de la contraseña con salt (formato: salt$hash)
    """
    # Generar salt aleatorio
    salt = secrets.token_hex(16)
    # Crear hash con salt
    hash_obj = hashlib.sha256((salt + password).encode('utf-8'))
    return f"{salt}${hash_obj.hexdigest()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica una contraseña contra su hash.

    Args:
        plain_password: Contraseña en texto plano
        hashed_password: Hash de la contraseña guardado (formato: salt$hash)

    Returns:
        bool: True si la contraseña coincide, False en caso contrario
    """
    try:
        # Extraer salt y hash
        parts = hashed_password.split('$')
        if len(parts) != 2:
            return False
        salt, stored_hash = parts
        # Verificar
        hash_obj = hashlib.sha256((salt + plain_password).encode('utf-8'))
        return hash_obj.hexdigest() == stored_hash
    except Exception:
        return False
