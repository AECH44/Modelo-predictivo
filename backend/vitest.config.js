// Vitest config para backend.
// - node: entorno por defecto (jsdom no es necesario, es Express)
// - include: solo archivos *.test.js dentro de tests/
// - coverage: opcional via `npm run test:coverage` (no instalado por defecto)

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // Los tests de rutas que importan db.js necesitan postgres. Para
    // mantener los unit tests rapidos y sin deps externas, db.js se
    // mockea con `vi.mock` en los tests de integracion.
    testTimeout: 10000,
  },
})