"""
Modelos Pydantic para autenticación
"""
from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    """Modelo para registro de usuarios"""
    email: EmailStr = Field(..., description="Correo electrónico del usuario")
    password: str = Field(..., min_length=6, description="Contraseña (mínimo 6 caracteres)")
    nombre: str = Field(..., min_length=1, max_length=160, description="Nombre del usuario")


class UserLogin(BaseModel):
    """Modelo para login de usuarios"""
    email: EmailStr = Field(..., description="Correo electrónico del usuario")
    password: str = Field(..., description="Contraseña del usuario")


class UserResponse(BaseModel):
    """Modelo de respuesta de información de usuario"""
    id: int | str
    email: str
    nombre: str | None = None


class LoginResponse(BaseModel):
    """Modelo de respuesta para login exitoso"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenPayload(BaseModel):
    """Modelo para el payload del token JWT"""
    sub: int | str  # ID del usuario
    email: str
    exp: int  # Timestamp de expiración
