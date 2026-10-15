import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

import { testConnection } from './db.js'
import routes from './routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PORT = Number(process.env.PORT) || 4000
const ORIGINS = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// Directorio donde el script ml/analysis/ guarda los graficos del modelo.
// Se sirve bajo /assets/analysis/*.png para que la UI los pueda mostrar.
const ANALYSIS_DIR = path.join(
  __dirname, '..', '..',
  'ml-training', 'analysis',
)

// URL del servicio FastAPI que sirve el modelo ML real.
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000'

const app = express()

app.use(
  cors({
    origin: (origin, cb) => {
      // Permitir peticiones sin origin (curl, Postman) y los orígenes configurados
      if (!origin) return cb(null, true)
      if (ORIGINS.includes(origin)) return cb(null, true)
      return cb(new Error(`Origen no permitido: ${origin}`))
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))

// Servir graficos del analisis (PNG) del modelo ML
app.use(
  '/assets/analysis',
  express.static(ANALYSIS_DIR, {
    maxAge: '5m',
    setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=300'),
  }),
)

// Health check unificado: reporta Express + DB + FastAPI.
// Pensado para que el panel admin muestre el estado de los 3 servicios en un vistazo.
// `model_version` se lee del mismo desercion_metrics.json que el panel Analisis.
app.get('/api/health', async (_req, res) => {
  const dbStatus = await testConnection().then(() => 'connected').catch(() => 'disconnected')
  // Ping FastAPI con timeout duro (1.5s) para no colgar el health check.
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 1500)
  let fastapi = 'down'
  let modelLoaded = false
  let modelVersion = null
  try {
    const r = await fetch(`${FASTAPI_URL}/api/health`, { signal: ctl.signal })
    if (r.ok) {
      const data = await r.json().catch(() => ({}))
      fastapi = data.status === 'healthy' ? 'up' : 'degraded'
      modelLoaded = data.model_loaded === true
      modelVersion = data.model_version || null
    } else {
      fastapi = 'down'
    }
  } catch {
    fastapi = 'down'
  } finally {
    clearTimeout(timer)
  }
  res.json({
    ok: true,
    express: 'up',
    db: dbStatus,
    fastapi,
    model_loaded: modelLoaded,
    model_version: modelVersion,
  })
})

app.use('/api', routes)

app.use((err, _req, res, _next) => {
  console.error('[error]', err)
  res.status(500).json({ ok: false, message: err.message || 'Error interno.' })
})

async function start() {
  try {
    await testConnection()
  } catch (err) {
    console.error('[startup] No se pudo conectar a PostgreSQL:', err.message)
    console.error('Verifica DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD en backend/.env')
    process.exit(1)
  }
  app.listen(PORT, () => {
    console.log(`[server] Escuchando en http://localhost:${PORT}`)
    console.log(`[server] CORS habilitado para: ${ORIGINS.join(', ')}`)
  })
}

start()
