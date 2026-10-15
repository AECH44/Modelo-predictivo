/**
 * Importa estudiantes desde el CSV identificado
 * (`base-de-datos-para-proyecto-de-grado-Ing-_1_.csv`) a:
 *
 *   - `usuarios`           (cuenta con role=estudiante, password=documento)
 *   - `student_profiles`   (perfil academico del CSV, completed=true)
 *   - `predictions`        (prediccion ML auto-computada al alta)
 *
 * Politica institucional: el CSV es el roster autoritativo. Cualquier
 * correo presente en el CSV es valido, sin importar el dominio.
 *
 * Uso:
 *   node src/scripts/import-students-v2.js [<ruta.csv>] [--dry-run] [--limit N] [--reset]
 *
 *   --dry-run   Solo transformar y validar; no escribir en la BD.
 *   --limit N   Procesar solo las primeras N filas.
 *   --reset     Re-hashear el password aunque el usuario ya exista.
 *
 * El script es idempotente: ejecutarlo varias veces NO duplica cuentas.
 * Si una fila del CSV tiene correo o documento duplicado intra-CSV, se
 * omite con warn (mitiga conflictos de unicidad en BD).
 *
 * Genera un CSV `credenciales_generadas.csv` junto al CSV original con
 * la lista documento,nombre,correo,pwd,accion,prediction_ok para entrega
 * a cada estudiante.
 *
 * Importante: program='sistemas' para todos (el CSV no distingue programas).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'
import { pool, testConnection } from '../db.js'
import { hashPassword } from '../auth.js'
import { upsertProfile, savePrediction } from '../profiles.js'
import { computePrediction } from '../predictor.js'
import { parseCsvRow, validateRow, splitMetadata } from '../lib/csv-to-profile.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEFAULT_CSV = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'data',
  'base-de-datos-para-proyecto-de-grado-Ing-_1_.csv',
)

const PROTECTED_ROLES = new Set(['administrador', 'rector', 'decano', 'profesor'])

function fail(msg) {
  console.error(`\n[ERROR] ${msg}\n`)
  process.exit(1)
}

function normalizeHeader(s) {
  return (s || '').toString().trim()
}

// =====================================================================
// upsertUserAsStudent(client, { documento, email, nombres, passwordHash })
//   Idempotente: si existe por documento o email actualiza; si no crea.
//   Rechaza:
//     - cuentas con is_synthetic=true (R5)
//     - cuentas con role protegido (R6) — admin/rector/decano/profesor
// =====================================================================
async function upsertUserAsStudent(client, { documento, email, nombres, passwordHash }) {
  const found = await client.query(
    `SELECT id, documento, email, role, is_synthetic
       FROM usuarios
      WHERE documento = $1 OR LOWER(email) = LOWER($2)
      LIMIT 1`,
    [documento, email],
  )
  const existing = found.rows[0]

  if (existing) {
    if (existing.is_synthetic === true) {
      return { ok: false, accion: 'skip_sintetica', reason: 'cuenta institucional con flag sintético' }
    }
    if (PROTECTED_ROLES.has(existing.role)) {
      return {
        ok: false,
        accion: 'skip_protegido',
        reason: `cuenta con role protegido (${existing.role})`,
      }
    }
    const upd = await client.query(
      `UPDATE usuarios
          SET documento = $1,
              username  = $2,
              email     = LOWER($3),
              role      = 'estudiante',
              program   = 'sistemas',
              password_hash = $4,
              is_active = TRUE,
              updated_at = NOW()
        WHERE id = $5
        RETURNING id, documento, email, role`,
      [documento, nombres, email, passwordHash, existing.id],
    )
    return { ok: true, accion: 'actualizado', row: upd.rows[0] }
  }

  const ins = await client.query(
    `INSERT INTO usuarios
       (documento, username, email, password_hash, role, program,
        semester, study_hours, english_level, is_active)
     VALUES ($1, $2, LOWER($3), $4, 'estudiante', 'sistemas',
             '8', '12', 'B1', TRUE)
     RETURNING id, documento, email, role`,
    [documento, nombres, email, passwordHash],
  )
  return { ok: true, accion: 'creado', row: ins.rows[0] }
}

async function main() {
  const argv = process.argv.slice(2)
  let dryRun = false
  let reset = false
  let limit = 0
  const positional = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') dryRun = true
    else if (a === '--reset') reset = true
    else if (a.startsWith('--limit=')) limit = Number.parseInt(a.slice('--limit='.length), 10)
    else if (a === '--limit') {
      const n = Number.parseInt(argv[i + 1], 10)
      if (Number.isFinite(n)) { limit = n; i++ }
    }
    else positional.push(a)
  }

  const csvPath = positional[0] ? path.resolve(positional[0]) : DEFAULT_CSV
  if (!fs.existsSync(csvPath)) fail(`No existe el archivo: ${csvPath}`)

  console.log(`[import-students-v2] Leyendo ${csvPath}...`)
  const raw = fs.readFileSync(csvPath, 'utf8')
  let rows
  try {
    rows = parse(raw, {
      columns: (h) => h.map(normalizeHeader),
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    })
  } catch (err) {
    fail(`No se pudo parsear el CSV: ${err.message}`)
  }
  if (!rows.length) fail('El CSV esta vacio.')

  console.log(`[import-students-v2] ${rows.length} filas leidas.`)
  const headerCols = Object.keys(rows[0])
  console.log(`[import-students-v2] Columnas (${headerCols.length}): ${headerCols.slice(0, 8).join(', ')} ...`)

  if (!dryRun) await testConnection()

  const seenCorreos = new Set()
  const seenDocumentos = new Set()
  let created = 0
  let updated = 0
  let skipped = 0
  let predictionOk = 0
  let predictionFail = 0
  const errors = []
  const credenciales = []

  const total = limit > 0 ? Math.min(limit, rows.length) : rows.length

  for (let i = 0; i < total; i++) {
    const r = rows[i]
    const fila = i + 2 // +1 header, +1 base-1

    const parsed = parseCsvRow(r)
    const validation = validateRow(parsed)
    if (!validation.ok) {
      errors.push(`Fila ${fila}: ${validation.reason}`)
      skipped++
      continue
    }
    const valid = validation.data
    const meta = splitMetadata(valid)
    const documento = meta.identificacion
    const correo = meta.correo
    const nombres = meta.nombres
    const carnet = meta.carnet

    // Duplicados intra-CSV (R1, R2).
    if (seenCorreos.has(correo)) {
      errors.push(`Fila ${fila}: correo duplicado en CSV (${correo})`)
      skipped++
      continue
    }
    if (seenDocumentos.has(documento)) {
      errors.push(`Fila ${fila}: documento duplicado en CSV (${documento})`)
      skipped++
      continue
    }
    seenCorreos.add(correo)
    seenDocumentos.add(documento)

    if (dryRun) {
      console.log(
        `[dry-run] Fila ${fila}: ${documento} ${nombres} <${correo}> carnet=${carnet ?? '-'}`,
      )
      continue
    }

    const passwordPlain = documento
    const passwordHash = await hashPassword(passwordPlain)

    const client = await pool.connect()
    let predictionOutcome = 'skipped'
    try {
      await client.query('BEGIN')

      const upsertResult = await upsertUserAsStudent(client, {
        documento,
        email: correo,
        nombres,
        passwordHash,
      })
      if (!upsertResult.ok) {
        errors.push(`Fila ${fila}: ${upsertResult.accion} (${upsertResult.reason})`)
        await client.query('ROLLBACK')
        skipped++
        continue
      }

      const userId = upsertResult.row.id
      // Upsert perfil (set completed=true automatico en upsertProfile).
      // Pasamos `client` para que la operacion vea la fila recien creada
      // dentro de la misma transaccion.
      const profile = await upsertProfile(userId, meta.profileFields, client)

      // Intentar computar prediccion. Si falla, NO rollback: dejamos
      // el usuario creado y emitimos warn (R7).
      try {
        const prediction = await computePrediction(profile)
        await savePrediction(userId, prediction, client)
        predictionOutcome = 'ok'
        predictionOk++
      } catch (err) {
        predictionOutcome = 'fail'
        predictionFail++
        errors.push(
          `Fila ${fila} (user_id=${userId}): prediccion fallo: ${err.message}`,
        )
      }

      await client.query('COMMIT')

      if (upsertResult.accion === 'creado') created++
      else updated++

      credenciales.push({
        documento,
        nombre: nombres,
        correo,
        carnet,
        programa: 'sistemas',
        accion: upsertResult.accion + (reset ? ' (pwd reseteado)' : ''),
        password: passwordPlain,
        prediction_ok: predictionOutcome === 'ok' ? '1' : '0',
      })
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      errors.push(`Fila ${fila}: ${err.message}`)
      skipped++
    } finally {
      client.release()
    }

    if ((i + 1) % 50 === 0) {
      console.log(
        `[import-students-v2] Progreso: ${i + 1}/${total} (creados=${created} actualizados=${updated} omitidos=${skipped})`,
      )
    }
  }

  console.log('\n================================================')
  console.log('  RESUMEN DE IMPORTACION v2')
  console.log('================================================')
  console.log(`  Filas procesadas: ${total}`)
  console.log(`  Creados:          ${created}`)
  console.log(`  Actualizados:     ${updated}`)
  console.log(`  Omitidos:         ${skipped}`)
  console.log(`  Predicciones OK:   ${predictionOk}`)
  console.log(`  Predicciones FAIL:${predictionFail}`)

  if (errors.length) {
    console.log(`\n  Detalles (${errors.length}):`)
    errors.slice(0, 30).forEach((e) => console.log('    - ' + e))
    if (errors.length > 30) console.log(`    ... y ${errors.length - 30} mas`)
  }

  if (credenciales.length && !dryRun) {
    const outPath = path.resolve(path.dirname(csvPath), 'credenciales_generadas.csv')
    const lines = [
      'documento,nombre,correo,carnet,programa,password,accion,prediction_ok',
    ]
    credenciales.forEach((c) => {
      lines.push(
        [
          c.documento,
          JSON.stringify(c.nombre),
          c.correo,
          c.carnet ?? '',
          c.programa,
          c.password,
          c.accion,
          c.prediction_ok,
        ].join(','),
      )
    })
    fs.writeFileSync(outPath, lines.join('\n'), 'utf8')
    console.log(`\n  Credenciales exportadas a: ${outPath}`)
  }

  await pool.end()
}

main().catch((err) => {
  console.error('[import-students-v2] Fatal:', err)
  process.exit(1)
})