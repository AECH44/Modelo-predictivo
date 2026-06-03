/**
 * Asegura en BD las 4 cuentas administrativas del proyecto:
 *   - Rector:        documento 91497570  rectoria@unac.edu.co           role=rector
 *   - Decano:        documento 91475722  facultad.ingenieria@unac.edu.co role=decano
 *   - Profesor:      documento 7702661   javierf.cordobap@unac.edu.co   role=profesor
 *   - Administrador: documento 1001417605 jhanc.mesae@unac.edu.co        role=administrador
 *
 * Comportamiento:
 *   - Si el usuario ya existe por documento, actualiza su nombre, email,
 *     rol y program. Resetea el password al mismo documento (politica
 *     institucional: password = documento).
 *   - Si el usuario ya existe por email (con otro documento), se actualiza
 *     el documento al indicado y se hace lo mismo. Asi cubrimos el caso
 *     del administrador: el correo jhanc.mesae@unac.edu.co ya existe
 *     asociado al documento 123456789 — lo migramos a 1001417605.
 *   - Si no existe, lo crea con password = hash(documento).
 *
 * Idempotente: se puede correr cuantas veces se quiera.
 *
 * Uso:
 *   node src/scripts/seed-admins.js
 */
import { pool, testConnection } from '../db.js'
import { hashPassword } from '../auth.js'

const ADMINS = [
  {
    role: 'rector',
    documento: '91497570',
    username: 'PEÑUELA PINEDA JAHISBER',
    email: 'rectoria@unac.edu.co',
    program: 'all',
  },
  {
    role: 'decano',
    documento: '91475722',
    username: 'NIÑO MANRIQUE JHON FREDY',
    email: 'facultad.ingenieria@unac.edu.co',
    program: 'all',
  },
  {
    role: 'profesor',
    documento: '7702661',
    username: 'CÓRDOBA PERDOMO JAVIER FRANCISCO',
    email: 'javierf.cordobap@unac.edu.co',
    program: 'sistemas',
  },
  {
    role: 'administrador',
    documento: '1001417605',
    username: 'MESA ESCOBAR JHAN CARLOS',
    email: 'jhanc.mesae@unac.edu.co',
    program: 'all',
  },
]

async function upsertAdmin({ role, documento, username, email, program }) {
  const passwordHash = await hashPassword(documento)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 1) Buscar por documento o email.
    const found = await client.query(
      `SELECT id, documento, email, role FROM usuarios
         WHERE documento = $1 OR LOWER(email) = LOWER($2)
         LIMIT 1`,
      [documento, email],
    )

    if (found.rows.length) {
      const id = found.rows[0].id
      await client.query(
        `UPDATE usuarios
            SET documento = $1,
                username  = $2,
                email     = LOWER($3),
                role      = $4,
                program   = $5,
                password_hash = $6,
                updated_at = NOW()
          WHERE id = $7`,
        [documento, username, email, role, program, passwordHash, id],
      )
      await client.query('COMMIT')
      return { id, accion: 'actualizado' }
    }

    // 2) No existe -> crear.
    const ins = await client.query(
      `INSERT INTO usuarios
         (documento, username, email, password_hash, role, program,
          semester, study_hours, english_level)
       VALUES ($1, $2, LOWER($3), $4, $5, $6, '8', '12', 'B1')
       RETURNING id`,
      [documento, username, email, passwordHash, role, program],
    )
    await client.query('COMMIT')
    return { id: ins.rows[0].id, accion: 'creado' }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

async function main() {
  console.log('[seed-admins] Conectando a la BD...')
  await testConnection()

  console.log(`[seed-admins] Procesando ${ADMINS.length} cuentas administrativas...`)
  const results = []
  for (const a of ADMINS) {
    try {
      const r = await upsertAdmin(a)
      results.push({ ...a, ...r })
      console.log(
        `  [${r.accion.padEnd(10)}] ${a.role.padEnd(13)} ${a.documento}  ${a.email}  -> ${a.username}`,
      )
    } catch (err) {
      console.error(`  [ERROR      ] ${a.role} ${a.documento}: ${err.message}`)
    }
  }

  console.log('\n================================================')
  console.log('  CREDENCIALES (password = documento)')
  console.log('================================================')
  for (const r of results) {
    console.log(`  ${r.role.padEnd(13)}  doc: ${r.documento}  pwd: ${r.documento}  ${r.email}`)
  }

  await pool.end()
}

main().catch((err) => {
  console.error('[seed-admins] Fatal:', err)
  process.exit(1)
})
