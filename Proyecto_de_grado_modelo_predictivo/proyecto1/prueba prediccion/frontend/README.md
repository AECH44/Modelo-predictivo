# 🎨 Frontend - React + Vite

## 📋 Descripción
Interfaz de usuario para el Sistema de Predicción Saber Pro. Desarrollado con React 18 y Vite para una experiencia rápida y moderna.

## 🚀 Inicio Rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Crear archivo .env
```bash
cp .env.example .env
```
Edita `.env` con la URL de tu backend:
```env
VITE_API_URL=http://localhost:8000
```

### 3. Iniciar servidor de desarrollo
```bash
npm run dev
```
La aplicación abrirá automáticamente en `http://localhost:5173`

### 4. Compilar para producción
```bash
npm run build
```

## 📁 Estructura de Archivos

```
frontend/src/
├── components/           # Componentes reutilizables
│   ├── PredictionForm.jsx      # Formulario de entrada
│   ├── ResultsDisplay.jsx      # Muestra resultados
│   ├── LoadingSpinner.jsx      # Spinner de carga
│   └── ErrorAlert.jsx          # Alertas de error
├── pages/               # Páginas (futuro)
├── services/            # Servicios API
│   └── apiService.js    # Cliente HTTP
├── App.jsx              # Componente raíz
├── main.jsx             # Punto entrada
├── index.css            # Estilos Tailwind
└── App.css              # Estilos específicos
```

## 🔄 Flujo de Datos

```
Usuario llenar form
    ↓
PredictionForm valida
    ↓
apiService.predictPerformance()
    ↓
POST /predict al backend
    ↓
Backend procesa (IA + BD)
    ↓
ResponseJSON → ResultsDisplay
    ↓
Muestra predicción
```

## 🎯 Componentes Principales

### PredictionForm
- Recibe datos del estudiante
- Valida todos los campos
- Envía POST a `/predict`
- Maneja estados de carga

### ResultsDisplay
- Muestra categoría (Bajo, Medio, Alto)
- Barra de progreso con % confianza
- Recomendaciones personalizadas
- Hora de predicción

### ErrorAlert
- Mensaje de error amigable
- Cierre manual
- Auto-limpieza

## 🌐 Variables de Entorno

```env
VITE_API_URL=http://localhost:8000
VITE_API_BASE_PATH=/api
```

## 📦 Dependencias

- **react** 18.2.0 - Framework UI
- **react-dom** 18.2.0 - Renderizador DOM
- **axios** 1.6.0 - Cliente HTTP
- **tailwindcss** 3.3.0 - Estilos CSS

## 🛠️ Herramientas de Desarrollo

- **vite** 5.0.0 - Bundler rápido
- **eslint** 8.50.0 - Linter
- **@vitejs/plugin-react** 4.0.0 - Plugin Vite React

## ✅ Checklist de Desarrollo

- [x] Formulario con validación
- [x] Consumo API con axios
- [x] Manejo de errores
- [x] Estados de carga
- [x] Responsivo (Mobile-first)
- [x] Estilos Tailwind
- [ ] Tests unitarios
- [ ] Historial de predicciones
- [ ] Gráficos de resultados

## 🚨 Errores Comunes

### "Cannot find module 'react'"
```bash
npm install
```

### CORS Error
Asegúrate que FastAPI tiene:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Backend no responde
Verifica que FastAPI está corriendo:
```bash
python backend/run.py  # En otra terminal
```

## 📱 Responsividad

- **Mobile**: Stack vertical, inputs full-width
- **Tablet**: 2 columnas en formulario
- **Desktop**: Diseño optimizado 2 columnas

## 🔐 Seguridad

- [ ] HTTPS en producción
- [ ] Rate limiting en API
- [ ] Validación server-side
- [ ] Sanitizar inputs
- [ ] Csrf tokens

---

**Desarrollado para Proyecto de Grado 2024**
