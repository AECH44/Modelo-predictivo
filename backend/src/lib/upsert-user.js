// =====================================================================
// Alta/actualizacion de un usuario estudiante.
//
// Idempotente: si existe por documento o correo actualiza; si no, crea.
//
// IMPORTANTE — el hash de la contrasena:
//   La contrasena institucional es el numero de documento. Al ACTUALIZAR un
//   usuario existente NO se regenera el hash salvo que se pida explicito
//   (`resetPassword: true`): si el estudiante la cambio por su cuenta, se
//   respeta. Antes el import re-hasheaba siempre, sin importar el flag
//   `--reset`, e invalidaba las contrasenas que los estudiantes ya habian
//   cambiado.
//
// Roles protegidos (administrador / coordinador / decano / profesor) y cuentas
// marcadas como sinteticas NO se tocan: la ingesta del roster no puede
//Convertir un administrador en estudiante ni viceversa.
// =====================================================================

const PROTECTED_ROLES = new Set(['administrador', 'coordinador', 'decano', 'profesor'])

export async function upsertUserAsStudent(
  client,
  { documento, email, nombres, passwordHash, resetPassword = false },
) {
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
      return {
        ok: false,
        accion: 'skip_sintetica',
        reason: 'cuenta institucional con flag sintético',
      }
    }
    if (PROTECTED_ROLES.has(existing.role)) {
      return {
        ok: false,
        accion: 'skip_protegido',
        reason: `cuenta con role protegido (${existing.role})`,
      }
    }
    // El hash solo se reescribe si se pide. `COALESCE($4, password_hash)`
    // deja el valor actual intacto cuando no se pasa un hash nuevo.
    const upd = await client.query(
      `UPDATE usuarios
          SET documento = $1,
              username  = $2,
              email     = LOWER($3),
              role      = 'estudiante',
              program   = 'sistemas',
              password_hash = COALESCE($4, password_hash),
              is_active = TRUE,
              updated_at = NOW()
        WHERE id = $5
        RETURNING id, documento, email, role`,
      [documento, nombres, email, resetPassword ? passwordHash : null, existing.id],
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

export { PROTECTED_ROLES }
