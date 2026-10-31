/**
 * Sincroniza `student_profiles` con el CSV del roster, SIN tocar `usuarios`.
 *
 * POR QUE EXISTE
 * --------------
 * El export de la universidad trae a algunos estudiantes mas de una vez (una
 * fila por corte de su carrera). El import original DESCARTABA la fila
 * repetida y se quedaba con la primera, que para varios estudiantes es la de
 * primer semestre: sin promedios y, por lo tanto, sin prediccion.
 *
 * Ejemplo real:
 *   ESPEJO RODRIGUEZ JOHN STIVEN | sem 1  | prom_acum 0.00 | avance 0.00%
 *   ESPEJO RODRIGUEZ JOHN STIVEN | sem 10 | prom_acum 4.10 | avance 91.18%
 *
 * Este script aplica la regla correcta: se conserva la fila que tiene datos
 * academicos y, a igualdad de datos, la de semestre mas alto.
 *
 * POR QUE NO TOCA `usuarios`
 * --------------------------
 * El import completo re-hashea la contrasena institucional de cada
 * estudiante (que es su numero de documento). Eso invalidaria las contrasenas
 * que los estudiantes hayan cambiado por su cuenta. Aqui solo se actualiza
 * el perfil academico, que es lo unico que el CSV aporta.
 *
 * Uso:
 *   cd backend
 *   node src/scripts/sync-perfiles.js [--dry-run] [--recompute]
 */

import fs from 'node:fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

import { pool } from '../db.js'
import {
  parseCsvRow,
  validateRow,
  splitMetadata,
  selectBestRowsPerStudent,
} from '../lib/csv-to-profile.js'
import { upsertUserAsStudent } from '../lib/upsert-user.js'
import { upsertProfile } from '../profiles.js'
import { computePrediction } from '../predictor.js'
import { hashPassword } from '../auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEFAULT_CSV = path.resolve(
  __dirname, '..', '..', '..', 'data',
  'base-de-datos-para-proyecto-de-grado-Ing-_1_.csv',
)

// Campos del perfil que se comparan para decidir si algo cambio.
const COMPARABLE = [
  'semestre', 'promedio_acumulado', 'promedio_basicas', 'promedio_ingenieria',
  'promedio_programacion', 'promedio_matematica_estadistica', 'num_reprobadas',
  'pct_creditos', 'estrato', 'acceso_internet', 'acceso_pc', 'trabaja',
  'genero', 'edad', 'ciudad', 'horas_estudio_semana', 'nivel_ingles',
  'simulacros_realizados', 'asistencia_pct', 'creditos_aprobados',
  'asignaturas_aprobadas',
]

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
const mismo = (a, b) => {
  const na = num(a)
  const nb = num(b)
  if (na !== null && nb !== null) return Math.abs(na - nb) < 1e-9
  return (a ?? null) === (b ?? null)
}

async function main() {
  const argv = process.argv.slice(2)
  const dryRun = argv.includes('--dry-run')
  const recompute = argv.includes('--recompute')
  const csvArg = argv.find((a) => !a.startsWith('--'))
  const csvPath = csvArg ? path.resolve(csvArg) : DEFAULT_CSV

  if (!fs.existsSync(csvPath)) {
    console.error(`[ERROR] No existe el archivo: ${csvPath}`)
    process.exit(1)
  }

  console.log(`[sync-perfiles] Leyendo ${csvPath}...`)
  const raw = fs.readFileSync(csvPath, 'utf8')
  let rows
  try {
    rows = parse(raw, {
      columns: (h) => h.map((s) => (s || '').toString().trim()),
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    })
  } catch (err) {
    console.error(`[ERROR] No se pudo parsear el CSV: ${err.message}`)
    process.exit(1)
  }
  console.log(`[sync-perfiles] ${rows.length} filas leidas.`)

  // Deduplicacion: se conserva la mejor fila de cada estudiante.
  const dedupe = selectBestRowsPerStudent(rows)
  if (dedupe.resueltos.length) {
    console.log(
      `[sync-perfiles] ${dedupe.resueltos.length} estudiantes venían repetidos ` +
      `(se conserva la fila con datos y semestre más alto):`,
    )
    for (const d of dedupe.resueltos) {
      console.log(
        `    ${d.documento} ${d.nombres}: ${d.filas} filas -> sem ${d.semestreElegido} ` +
        `(prom ${d.promedioElegido}); descartadas ` +
        d.descartadas.map((x) => `sem ${x.semestre} (prom ${x.promedio})`).join(', '),
      )
    }
  }

  let actualizados = 0, sinCambio = 0, creados = 0, invalidas = 0
  let conPrediccion = 0, sinDatos = 0
  const cambios = []

  for (const { fila, indice } of dedupe.rows) {
    const parsed = parseCsvRow(fila)
    const validation = validateRow(parsed)
    if (!validation.ok) {
      invalidas++
      continue
    }
    const { identificacion: documento, profileFields } = splitMetadata(validation.data)

    const found = await pool.query(
      `SELECT u.id, sp.user_id AS sp_user_id,
              ${COMPARABLE.map((c) => `sp.${c}`).join(', ')}
         FROM usuarios u
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
        WHERE u.documento = $1`,
      [documento],
    )
    let actual = found.rows[0]

    // El estudiante no existe todavia: se crea con la contrasena
    // institucional (su numero de documento). Solo se crean usuarios NUEVOS:
    // los que ya existen conservan su contrasena.
    if (!actual) {
      if (dryRun) {
        creados++
        cambios.push({
          documento,
          nombre: validation.data._nombres,
          usuarioId: null,
          campos: ['(usuario nuevo)'],
          antes: {},
          despues: { ...profileFields },
        })
        continue
      }
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const passwordHash = await hashPassword(documento)
        const upsert = await upsertUserAsStudent(client, {
          documento,
          email: validation.data._correo,
          nombres: validation.data._nombres,
          passwordHash,
          resetPassword: false,
        })
        if (!upsert.ok) {
          await client.query('ROLLBACK')
          invalidas++
          console.log(
            `  [no creado] ${documento} ${validation.data._nombres}: ${upsert.reason}`,
          )
          continue
        }
        await client.query('COMMIT')
        actual = { id: upsert.row.id }
        creados++
        cambios.push({
          documento,
          nombre: validation.data._nombres,
          usuarioId: upsert.row.id,
          campos: ['(nuevo usuario)'],
          antes: {},
          despues: { ...profileFields },
        })
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {})
        invalidas++
        console.log(`  [error creando] ${documento}: ${err.message}`)
        continue
      } finally {
        client.release()
      }
    }

    // Que campos cambian? (para un usuario recien creado, todos)
    const esNuevo = actual.sp_user_id === undefined
    const diferencias = esNuevo
      ? COMPARABLE
      : COMPARABLE.filter((c) => !mismo(actual[c], profileFields[c]))
    if (diferencias.length === 0) {
      sinCambio++
      continue
    }

    if (!esNuevo) {
      cambios.push({
        documento,
        nombre: validation.data._nombres,
        usuarioId: actual.id,
        campos: diferencias,
        antes: Object.fromEntries(diferencias.map((c) => [c, actual[c]])),
        despues: Object.fromEntries(diferencias.map((c) => [c, profileFields[c]])),
      })
    }

    if (dryRun) {
      actualizados++
      continue
    }

    const profile = await upsertProfile(actual.id, profileFields)
    actualizados++

    if (recompute) {
      const prediction = await computePrediction(profile)
      if (prediction) {
        await pool.query(
          'DELETE FROM predictions WHERE user_id = $1', [actual.id])
        const { savePrediction } = await import('../profiles.js')
        await savePrediction(actual.id, prediction)
        conPrediccion++
      } else {
        await pool.query('DELETE FROM predictions WHERE user_id = $1', [actual.id])
        sinDatos++
      }
    }
  }

  console.log(`\n[sync-perfiles] Resumen:`)
  console.log(`  Perfiles actualizados: ${actualizados}`)
  console.log(`  Usuarios creados:      ${creados}`)
  console.log(`  Sin cambios:           ${sinCambio}`)
  console.log(`  Filas inválidas:       ${invalidas}`)
  if (recompute) {
    console.log(`  Con predicción nueva:  ${conPrediccion}`)
    console.log(`  Sin datos suficientes: ${sinDatos}`)
  }

  if (cambios.length) {
    console.log(`\n[sync-perfiles] Detalle de los cambios (${cambios.length}):`)
    for (const c of cambios) {
      const antes = c.campos
        .map((k) => `${k}: ${c.antes[k]} -> ${c.despues[k]}`)
        .join(', ')
      console.log(`  ${c.documento} ${c.nombre}`)
      console.log(`      ${antes}`)
    }
  }

  await pool.end()
}

main().catch(async (err) => {
  console.error('[sync-perfiles] error:', err)
  await pool.end().catch(() => {})
  process.exit(1)
})
