import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vite 8 usa lightningcss por defecto, pero tiene un bug con @keyframes.
  // Lo desactivamos: el dev server usa el CSS sin minificar (rapido),
  // y el build produce un bundle ~10% mas grande pero correcto.
  // Si Vite arregla esto, se puede quitar.
  build: {
    cssMinify: false,
  },
  // Headers no-cache para evitar que el navegador conserve CSS/JS viejos
  // aunque cambien los hashes de los assets. Es un workaround agresivo para
  // forzar siempre la version mas reciente del bundle durante desarrollo.
  server: {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  },
  preview: {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  },
})
