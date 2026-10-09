"""
Servicio de autenticación — flag de modo demo.

Como este FastAPI es un servicio interno (solo lo llama Express en localhost),
NO implementa JWT ni OAuth. La auth vive en `backend/` (Express).

Este módulo solo mantiene un flag global `demo_mode` que indica si la BD
no está disponible y el sistema debe funcionar en modo demo.
"""

from __future__ import annotations

from threading import Lock

_demo_mode: bool = True
_lock = Lock()


def set_demo_mode(enabled: bool) -> None:
    """Marca si el servicio debe operar en modo demo (sin BD)."""
    global _demo_mode
    with _lock:
        _demo_mode = bool(enabled)


def is_demo_mode() -> bool:
    """Retorna True si el servicio está en modo demo."""
    with _lock:
        return _demo_mode