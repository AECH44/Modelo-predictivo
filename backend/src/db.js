import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'saberpro',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

pool.on('error', (err) => {
  console.error('[db] Pool error:', err.message)
})

export async function testConnection() {
  const client = await pool.connect()
  try {
    const { rows } = await client.query('SELECT current_database() AS db, current_user AS usr')
    console.log(`[db] Conectado: db=${rows[0].db} user=${rows[0].usr}`)
    return true
  } finally {
    client.release()
  }
}
