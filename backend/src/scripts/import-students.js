/**
 * Importa estudiantes desde un CSV a la tabla `usuarios` con:
 *   - role: 'estudiante'
 *   - email: debe terminar en @unac.edu.co (se rechaza el resto)
 *   - password: hash bcrypt del mismo numero de documento
 *   - program: 'sistemas' | 'industrial' (segun columna)
 *
 * Uso:
 *   node src/scripts/import-students.js <ruta-al-csv>
 *
 * CSV esperado (encabezado obligatorio):
 *   documento,nombre,email,programa
 *   1099545610,Juan Perez,juan.perez@unac.edu.co,sistemas
 *   ...
 *
 * El script es idempotente: si el documento o el email ya existen, NO los
 * duplica. Los actualiza si el nombre/programa cambiaron, pero conserva el
 * password hash actual (si quieres resetearlo a "documento" de nuevo, pasa --reset).
 *
 * Al final imprime una tabla con los credenciales resultantes
 * (documento -> password) para que el administrador los entregue.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'csv-parse/sync'
import { pool, testConnection } from '../db.js'
import { hashPassword } from '../auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const INSTITUTIONAL_DOMAIN = '@unac.edu.co'
const NAME_RE =
  /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]+\.?(?:[ '-][A-Za-zÁÉÍÓÚÜáéíóúüÑñ]+\.?)*$/
const DOCUMENTO_RE = /^\d{5,15}$/

function fail(msg) {
  console.error(`\n[ERROR] ${msg}\n`)
  process.exit(1)
}

function normalizeHeader(s) {
  return (s || '').toString().trim().toLowerCase()
}

async function main() {
  const argv = process.argv.slice(2)
  const reset = argv.includes('--reset')
  const args = argv.filter((a) => a !== '--reset')
  if (args.length < 1) {
    console.log('Uso: node src/scripts/import-students.js <ruta.csv> [--reset]')
    process.exit(1)
  }
  const csvPath = path.resolve(args[0])
  if (!fs.existsSync(csvPath)) fail(`No existe el archivo: ${csvPath}`)

  console.log(`[import-students] Leyendo ${csvPath}...`)
  const raw = fs.readFileSync(csvPath, 'utf8')
  let rows
  try {
    rows = parse(raw, {
      columns: (h) => h.map(normalizeHeader),
      skip_empty_lines: true,
      trim: true,
    })
  } catch (err) {
    fail(`No se pudo parsear el CSV: ${err.message}`)
  }

  if (!rows.length) fail('El CSV esta vacio.')

  // Detectar columnas obligatorias (acepta sinonimos)
  const colDoc = ['documento', 'doc', 'cedula', 'identificacion'].find((c) => c in rows[0])
  const colName = ['nombre', 'name', 'username', 'nombres'].find((c) => c in rows[0])
  const colEmail = ['email', 'correo', 'mail'].find((c) => c in rows[0])
  const colProg = ['programa', 'program', 'carrera'].find((c) => c in rows[0])

  if (!colDoc || !colName || !colEmail) {
    fail(`Faltan columnas obligatorias. Encabezados vistos: ${Object.keys(rows[0]).join(', ')}`)
  }

  console.log(`[import-students] ${rows.length} filas leidas.`)
  console.log(`[import-students] Columnas: documento=${colDoc}, nombre=${colName}, email=${colEmail}, programa=${colProg ?? '(opcional)'}`)

  await testConnection()

  let created = 0
  let updated = 0
  let skipped = 0
  const errors = []
  const credenciales = [] // para imprimir al final

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const doc = (r[colDoc] || '').toString().trim()
    const name = (r[colName] || '').toString().trim()
    const email = (r[colEmail] || '').toString().trim().toLowerCase()
    const programRaw = (colProg ? r[colProg] : '').toString().trim().toLowerCase()
    const program = programRaw === 'industrial' ? 'industrial' : 'sistemas'

    // Validaciones
    if (!DOCUMENTO_RE.test(doc)) {
      errors.push(`Fila ${i + 2}: documento inválido "${doc}"`)
      skipped++
      continue
    }
    if (!NAME_RE.test(name) || name.length < 3) {
      errors.push(`Fila ${i + 2}: nombre inválido "${name}"`)
      skipped++
      continue
    }
    if (!email.endsWith(INSTITUTIONAL_DOMAIN)) {
      errors.push(`Fila ${i + 2}: email no institucional "${email}" (debe terminar en ${INSTITUTIONAL_DOMAIN})`)
      skipped++
      continue
    }

    // Password = el mismo documento (politica definida)
    const passwordPlain = doc
    const passwordHash = await hashPassword(passwordPlain)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Buscar existente por documento
      const exByDoc = await client.query('SELECT id, email FROM usuarios WHERE documento = $1', [doc])
      // ...o por email
      const exByEmail = await client.query('SELECT id, documento FROM usuarios WHERE email = $1', [email])

      if (exByDoc.rows.length && exByEmail.rows.length && exByDoc.rows[0].id !== exByEmail.rows[0].id) {
        // Conflicto: el documento y el email existen pero apuntan a personas distintas
        errors.push(`Fila ${i + 2}: documento ${doc} y email ${email} pertenecen a cuentas distintas.`)
        await client.query('ROLLBACK')
        skipped++
        continue
      }

      const existing = exByDoc.rows[0] || exByEmail.rows[0]

      if (existing) {
        // Actualizar nombre/programa y opcionalmente resetear password
        const setClauses = ['username = $1', 'email = $2', 'program = $3', 'updated_at = NOW()']
        const params = [name, email, program]
        if (reset) {
          setClauses.push('password_hash = $4')
          params.push(passwordHash)
        }
        params.push(existing.id)
        await client.query(
          `UPDATE usuarios SET ${setClauses.join(', ')} WHERE id = $${params.length}`,
          params
        )
        await client.query('COMMIT')
        updated++
        credenciales.push({ documento: doc, nombre: name, email, programa: program, accion: 'actualizado' + (reset ? ' (pwd reseteado)' : '') })
      } else {
        // Crear nuevo
        const studentRecordId = `${program === 'industrial' ? 'IND' : 'SIS'}-${Date.now()}-${i}`
        const ins = await client.query(
          `INSERT INTO usuarios
            (documento, username, email, password_hash, role, program, student_record_id, semester, study_hours, english_level)
           VALUES ($1,$2,$3,$4,'estudiante',$5,$6,'8','12','B1')
           RETURNING id`,
          [doc, name, email, passwordHash, program, studentRecordId]
        )
        await client.query('COMMIT')
        created++
        credenciales.push({ documento: doc, nombre: name, email, programa: program, accion: 'creado', password: passwordPlain })
      }
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      errors.push(`Fila ${i + 2}: ${err.message}`)
      skipped++
    } finally {
      client.release()
    }
  }

  // Resumen
  console.log('\n================================================')
  console.log('  RESUMEN DE IMPORTACION')
  console.log('================================================')
  console.log(`  Creados:     ${created}`)
  console.log(`  Actualizados:${updated}`)
  console.log(`  Omitidos:    ${skipped}`)
  if (errors.length) {
    console.log(`\n  Errores (${errors.length}):`)
    errors.slice(0, 20).forEach((e) => console.log('    - ' + e))
    if (errors.length > 20) console.log(`    ... y ${errors.length - 20} más`)
  }

  if (credenciales.length) {
    console.log('\n  CREDENCIALES (entregar a cada estudiante):')
    console.log('  ------------------------------------------------')
    credenciales.forEach((c) => {
      const pwd = c.password ? `  pwd: ${c.password}` : `  pwd: <se conserva>`
      console.log(`  ${c.documento}  ${c.nombre.padEnd(30)}  ${c.email.padEnd(35)}  ${c.programa.padEnd(11)}${pwd}`)
    })
    // Persistir a CSV para entrega
    const outPath = path.resolve(path.dirname(csvPath), 'credenciales_generadas.csv')
    const lines = ['documento,nombre,email,programa,password,accion']
    credenciales.forEach((c) => {
      lines.push([c.documento, JSON.stringify(c.nombre), c.email, c.programa, c.password ?? '', c.accion].join(','))
    })
    fs.writeFileSync(outPath, lines.join('\n'), 'utf8')
    console.log(`\n  También exportado a: ${outPath}`)
  }

  await pool.end()
}

main().catch((err) => {
  console.error('[import-students] Fatal:', err)
  process.exit(1)
})
