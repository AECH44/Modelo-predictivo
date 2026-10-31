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
import {
  parseCsvRow,
  validateRow,
  splitMetadata,
  selectBestRowsPerStudent,
} from '../lib/csv-to-profile.js'
import { upsertUserAsStudent } from '../lib/upsert-user.js'

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

function fail(msg) {
  console.error(`\n[ERROR] ${msg}\n`)
  process.exit(1)
}

function normalizeHeader(s) {
  return (s || '').toString().trim()
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

  // Deduplicacion: un mismo estudiante puede venir en varias filas (una por
  // corte de su carrera). Se conserva la mejor (con datos y semestre mas
  // alto) en vez de descartar la repetida y quedarse con la primera.
  const dedupe = selectBestRowsPerStudent(rows)
  if (dedupe.resueltos.length) {
    console.log(
      `[import-students-v2] ${dedupe.resueltos.length} estudiantes venían repetidos ` +
      `(se conserva la fila con datos y semestre más alto):`,
    )
    for (const d of dedupe.resueltos) {
      console.log(
        `    ${d.documento} ${d.nombres}: ${d.filas} filas -> sem ${d.semestreElegido} ` +
        `(prom ${d.promedioElegido}); descartadas sem ${d.semestreDescartado.join(', ')} ` +
        `(prom ${d.promedioDescartado.join(', ')})`,
      )
    }
  }
  // `filas` conserva el indice original del CSV para que los mensajes de
  // error sigan apuntando a la linea correcta del archivo.
  const filas = dedupe.rows

  if (!dryRun) await testConnection()

  const seenCorreos = new Set()
  const seenDocumentos = new Set()
  let created = 0
  let updated = 0
  let skipped = 0
  let predictionOk = 0
  let predictionFail = 0
  let predictionSinDatos = 0
  const errors = []
  const credenciales = []

  const total = limit > 0 ? Math.min(limit, filas.length) : filas.length

  for (let i = 0; i < total; i++) {
    const r = filas[i].fila
    // Numero de linea real en el CSV original (para los mensajes).
    const fila = filas[i].indice + 2 // +1 header, +1 base-1

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
        // Solo con --reset se re-hashea la contrasena de un usuario que ya
        // existe. Sin el flag, se respeta la que el estudiante haya cambiado.
        resetPassword: reset,
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
        if (!prediction) {
          // Estudiante de primer semestre: sin historial academico todavia, no
          // hay prediccion que generar. No es un error.
          predictionOutcome = 'sin_datos'
          predictionSinDatos++
        } else {
          await savePrediction(userId, prediction, client)
          predictionOutcome = 'ok'
          predictionOk++
        }
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
  console.log(`  Sin datos (1er semestre): ${predictionSinDatos}`)

  if (errors.length) {
    console.log(`\n  Detalles (${errors.length}):`)
    errors.slice(0, 30).forEach((e) => console.log('    - ' + e))
    if (errors.length > 30) console.log(`    ... y ${errors.length - 30} más`)
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