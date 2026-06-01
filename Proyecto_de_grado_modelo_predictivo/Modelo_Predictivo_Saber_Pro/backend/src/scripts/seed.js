import 'dotenv/config'
import { pool, testConnection } from '../db.js'
import { hashPassword } from '../auth.js'
import { createUser, findUserByEmail } from '../users.js'

const DEMO_USERS = [
  {
    documento: '1000000001',
    username: 'Dra. Maria del Carmen',
    email: 'rector@saberpro.edu.co',
    password: '123456',
    role: 'rector',
    program: 'all',
    age: '54',
  },
  {
    documento: '1000000002',
    username: 'Dr. Roberto Martinez',
    email: 'decano@saberpro.edu.co',
    password: '123456',
    role: 'decano',
    program: 'sistemas',
    age: '47',
  },
  {
    documento: '1000000003',
    username: 'Prof. Carlos Lopez',
    email: 'profesor@saberpro.edu.co',
    password: '123456',
    role: 'profesor',
    program: 'sistemas',
    age: '39',
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
