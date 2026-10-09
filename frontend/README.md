# Frontend — Modelo Predictivo Saber Pro

Interfaz web en **React 19 + Vite 8** con CSS puro (sin frameworks).

## Stack

- React 19 + react-dom
- react-router-dom 7
- Vite 8 (build/dev server)
- ESLint 9

## Cómo correr

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # producción → dist/
npm run preview  # servir build local
npm run lint     # ESLint
```

## Estructura

```
src/
├── App.jsx              # Router y vistas por rol (5.4k líneas, monolito intencional)
├── App.css, index.css   # Estilos globales
├── api.js               # Wrapper del cliente HTTP (fetch + JWT)
├── main.jsx             # Entry point
├── components/          # Componentes reutilizables
│   ├── DataTable.jsx
│   └── Icon.jsx
└── assets/              # Imágenes y SVGs
```

El backend debe estar corriendo en `http://localhost:4000`.
Ver [`docs/api-endpoints.md`](../docs/api-endpoints.md) para los endpoints consumidos.
