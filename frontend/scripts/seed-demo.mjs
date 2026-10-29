#!/usr/bin/env node
/**
 * Creates the demo accounts for the workshop attendance gate.
 *
 *   node scripts/seed-demo.mjs           create or update the demo users
 *   node scripts/seed-demo.mjs --reset   also delete all workshops, attendance and gate results
 *
 * Reads FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 and DEMO_PASSWORD from the root .env.
 * This is the only way to create a facilitator, because the Firestore rules
 * never let a user set their own role.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const envFile = resolve(import.meta.dirname, '../../.env')
for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
}

const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64
const password = process.env.DEMO_PASSWORD
if (!key || !password) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 and DEMO_PASSWORD must be set in .env')
  process.exit(1)
}

initializeApp({ credential: cert(JSON.parse(Buffer.from(key, 'base64').toString('utf8'))) })
const auth = getAuth()
const db = getFirestore()

const DEMO_USERS = [
  { email: 'facilitator@demo-gate.test', displayName: 'Priya Nair', role: 'facilitator' },
  { email: 'alex@demo-gate.test', displayName: 'Alex Chen', role: 'user' },
  { email: 'sam@demo-gate.test', displayName: 'Sam Taylor', role: 'user' },
  { email: 'jordan@demo-gate.test', displayName: 'Jordan Lee', role: 'user' },
]

async function upsertUser({ email, displayName, role }) {
  let user
  try {
    user = await auth.getUserByEmail(email)
    user = await auth.updateUser(user.uid, { password, displayName, emailVerified: true })
  } catch {
    user = await auth.createUser({ email, password, displayName, emailVerified: true })
  }

  const now = Timestamp.now()
  await db.collection('users').doc(user.uid).set(
    {
      uid: user.uid,
      email,
      displayName,
      photoURL: null,
      role,
      createdAt: now,
      updatedAt: now,
      _schemaVersion: 1,
    },
    { merge: true }
  )
  console.log(`${role.padEnd(11)} ${email}`)
}

async function clearCollection(name) {
  const snap = await db.collection(name).get()
  const batch = db.batch()
  snap.docs.forEach((doc) => batch.delete(doc.ref))
  await batch.commit()
  console.log(`cleared ${name} (${snap.size})`)
}

for (const user of DEMO_USERS) await upsertUser(user)

if (process.argv.includes('--reset')) {
  for (const name of ['workshops', 'attendance', 'assessment_access']) await clearCollection(name)
}
