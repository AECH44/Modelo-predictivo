#!/usr/bin/env python
"""
Script para iniciar el servidor FastAPI
"""
import os
import sys
import uvicorn
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', '8000'))  # Cambiar a 8000
    DEBUG = False

    print("[========================================]")
    print("[  Iniciando FastAPI - Predictor Saber Pro  ]")
    print("[========================================]")
    print("")
    print(f"    URL: http://{HOST}:{PORT}")
    print(f"    Docs: http://{HOST}:{PORT}/docs")
    print(f"    Debug: {DEBUG}")
    print("")

    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        reload=DEBUG,
        log_level="info"
    )