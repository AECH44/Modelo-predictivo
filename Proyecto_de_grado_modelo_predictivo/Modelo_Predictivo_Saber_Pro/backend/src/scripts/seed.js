import 'dotenv/config'
import { pool, testConnection } from '../db.js'
import { hashPassword } from '../auth.js'
import { createUser, findUserByEmail } from '../users.js'

const DEMO_USERS = [
  {
    documento: '1000000001',
    username: 'Dra. Maria del Carmen Restrepo',
    email: 'rector@unac.edu.co',
    password: '@7&arST76M&zS4',
    role: 'rector',
    program: 'all',
    age: '54',
  },
  {
    documento: '1000000002',
    username: 'Dr. Roberto Martinez Sanchez',
    email: 'decano.sistemas@unac.edu.co',
    password: 'He%343b8c&2B#m',
    role: 'decano',
    program: 'sistemas',
    age: '47',
  },
  {
    documento: '1000000003',
    username: 'Prof. Carlos Lopez Velez',
    email: 'profesor.sistemas@unac.edu.co',
    password: 'Dwu955j_4yY48v',
    role: 'profesor',
    program: 'sistemas',
    age: '39',
  },
  {
    documento: '1000000005',
    username: 'Ing. Sandra Patricia Velez',
    email: 'decano.industrial@unac.edu.co',
    password: 'sGst&Gd8Gu#_tX',
    role: 'decano',
    program: 'industrial',
    age: '46',
  },
  {
    documento: '1000000006',
    username: 'Prof. Andres Felipe Castaneda',
    email: 'profesor.industrial@unac.edu.co',
    password: 'Wt9&&X#8m638d8',
    role: 'profesor',
    program: 'industrial',
    age: '41',
  },
  {
    documento: '1000000004',
    username: 'Jhan Carlos Mesa',
    email: 'jhan.mesa@saberpro.edu.co',
    password: '123456',
    role: 'estudiante',
    program: 'industrial',
    age: '24',
    studentRecordId: 'stu-ind-02',
  },
]

async function run() {
  await testConnection()
  let created = 0
  let skipped = 0
  for (const u of DEMO_USERS) {
    const existing = await findUserByEmail(u.email)
    if (existing) {
      console.log(`  - ${u.email}: ya existe, omitido`)
      skipped++
      continue
    }
    const passwordHash = await hashPassword(u.password)
    await createUser({
      documento: u.documento,
      username: u.username,
      email: u.email,
      passwordHash,
      role: u.role,
      program: u.program,
      age: u.age || null,
      studentRecordId: u.studentRecordId || null,
    })
    console.log(`  + ${u.email}: creado (${u.role})`)
    created++
  }
  console.log(`\nResumen: ${created} creados, ${skipped} omitidos.`)
  await pool.end()
}

run().catch((err) => {
  console.error('[seed] error:', err)
  process.exit(1)
})
