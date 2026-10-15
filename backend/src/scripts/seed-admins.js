/**
 * Asegura en BD las cuentas administrativas del proyecto:
 *   - Rector:        documento 91497570  rectoria@unac.edu.co           role=rector
 *   - Decano:        documento 91475722  facultad.ingenieria@unac.edu.co role=decano
 *   - Administrador: documento 99000001  admin.saberpro@unac.edu.co     role=administrador (pwd custom)
 *
 * Adicionalmente, demueve al estudiante MESA ESCOBAR JHAN CARLOS
 * (jhanc.mesae@unac.edu.co / doc 1001417605) desde administrador a
 * estudiante, para que reciba su prediccion al iniciar sesion con
 * su contrasena habitual.
 *
 * Comportamiento:
 *   - Si el usuario ya existe por documento, actualiza su nombre, email,
 *     rol, program y password_hash.
 *   - Si no existe, lo crea.
 *   - Las cuentas administrativas usan como password el documento
 *     (politica institucional), salvo el admin custom que tiene su propia
 *     contrasena.
 *
 * Idempotente: se puede correr cuantas veces se quiera.
 *
 * Uso:
 *   node src/scripts/seed-admins.js
 */
import { pool, testConnection } from '../db.js'
import { hashPassword } from '../auth.js'

const NEW_ADMIN_PASSWORD = 'SaberPro_Admin_2026!'

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
    role: 'administrador',
    documento: '99000001',
    username: 'ADMIN SABER PRO',
    email: 'admin.saberpro@unac.edu.co',
    program: 'all',
    customPassword: NEW_ADMIN_PASSWORD,
  },
]

async function demoteAdminToEstudiante() {
  // Cambia el rol del antiguo admin (estudiante del CSV) a estudiante
  // para que reciba su prediccion al iniciar sesion con su contrasena
  // habitual (que ya esta hasheada en la BD).
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const r = await client.query(
      `UPDATE usuarios
          SET role = 'estudiante', program = 'sistemas', updated_at = NOW()
        WHERE LOWER(email) = LOWER($1)
          AND role = 'administrador'
        RETURNING id, documento, email, username`,
      ['jhanc.mesae@unac.edu.co'],
    )
    await client.query('COMMIT')
    return r.rows
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

async function upsertAdmin({ role, documento, username, email, program, customPassword }) {
  // Si el admin tiene customPassword se usa esa; si no, password = documento
  // (politica institucional tradicional).
  const passwordHash = await hashPassword(customPassword || documento)
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

  console.log('[seed-admins] Demoviendo jhanc.mesae@unac.edu.co de administrador a estudiante...')
  const demoted = await demoteAdminToEstudiante()
  if (demoted.length) {
    for (const u of demoted) {
      console.log(`  [demovido] ${u.documento}  ${u.email}  ->  ${u.username} (rol=estudiante)`)
    }
  } else {
    console.log('  [info] No se demovio a nadie (ya estaba como estudiante o no existe).')
  }

  console.log(`\n[seed-admins] Procesando ${ADMINS.length} cuentas administrativas...`)
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
  console.log('  CREDENCIALES')
  console.log('================================================')
  for (const r of results) {
    const pwd = r.customPassword || r.documento
    console.log(`  ${r.role.padEnd(13)}  correo: ${r.email.padEnd(38)}  pwd: ${pwd}`)
  }

  await pool.end()
}

main().catch((err) => {
  console.error('[seed-admins] Fatal:', err)
  process.exit(1)
})
