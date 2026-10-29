/**
 * Firestore security rules tests. These run against the local Firestore
 * emulator, not the real project:
 *
 *   pnpm run test:rules   (from the repo root, needs Java 11+)
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-attendance-gate',
    firestore: { rules: readFileSync(resolve(__dirname, '../../../firebase/firestore.rules'), 'utf8') },
  })
})

afterAll(async () => {
  await env.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
  // Seed with rules switched off, the same way the Admin SDK writes.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'users/fac'), { uid: 'fac', email: 'f@test.com', role: 'facilitator' })
    await setDoc(doc(db, 'users/alice'), { uid: 'alice', email: 'a@test.com', role: 'user' })
    await setDoc(doc(db, 'users/bob'), { uid: 'bob', email: 'b@test.com', role: 'user' })
    await setDoc(doc(db, 'workshops/module-1'), { title: 'W1', moduleNumber: 1 })
    await setDoc(doc(db, 'attendance/module-1_alice'), {
      workshopId: 'module-1',
      studentUid: 'alice',
      status: 'present',
    })
    await setDoc(doc(db, 'attendance/module-1_bob'), {
      workshopId: 'module-1',
      studentUid: 'bob',
      status: 'absent',
    })
    await setDoc(doc(db, 'assessment_access/alice'), { studentUid: 'alice', unlocked: false })
  })
})

const as = (uid: string) => env.authenticatedContext(uid).firestore()
const anonymous = () => env.unauthenticatedContext().firestore()

describe('workshops', () => {
  it('any signed-in user can read the schedule', async () => {
    await assertSucceeds(getDocs(collection(as('alice'), 'workshops')))
  })

  it('signed-out visitors cannot read it', async () => {
    await assertFails(getDocs(collection(anonymous(), 'workshops')))
  })

  it('nobody can write from the client, not even a facilitator', async () => {
    await assertFails(setDoc(doc(as('fac'), 'workshops/module-2'), { title: 'W2' }))
    await assertFails(setDoc(doc(as('alice'), 'workshops/module-2'), { title: 'W2' }))
  })
})

describe('attendance', () => {
  it('a student can read their own records with a filtered query', async () => {
    const db = as('alice')
    await assertSucceeds(
      getDocs(query(collection(db, 'attendance'), where('studentUid', '==', 'alice')))
    )
  })

  it("a student cannot read another student's record", async () => {
    await assertFails(getDoc(doc(as('alice'), 'attendance/module-1_bob')))
  })

  it('a student cannot list everyone without the studentUid filter', async () => {
    await assertFails(getDocs(collection(as('alice'), 'attendance')))
  })

  it('a facilitator can read every record', async () => {
    await assertSucceeds(getDocs(collection(as('fac'), 'attendance')))
  })

  it('a student cannot mark or change their own attendance', async () => {
    const db = as('bob')
    await assertFails(
      setDoc(doc(db, 'attendance/module-2_bob'), {
        workshopId: 'module-2',
        studentUid: 'bob',
        status: 'present',
      })
    )
    await assertFails(updateDoc(doc(db, 'attendance/module-1_bob'), { status: 'present' }))
  })
})

describe('assessment_access', () => {
  it('a student can read their own gate result', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'assessment_access/alice')))
  })

  it("a student cannot read someone else's gate result", async () => {
    await assertFails(getDoc(doc(as('bob'), 'assessment_access/alice')))
  })

  it('a student cannot unlock the assessment from the browser', async () => {
    await assertFails(
      setDoc(doc(as('alice'), 'assessment_access/alice'), { studentUid: 'alice', unlocked: true })
    )
  })

  it('a facilitator can read every gate result', async () => {
    await assertSucceeds(getDocs(collection(as('fac'), 'assessment_access')))
  })
})

describe('users (role protection)', () => {
  it('a student cannot promote themselves to facilitator', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { role: 'facilitator' }))
  })

  it('a new user cannot sign up as a facilitator', async () => {
    await assertFails(
      setDoc(doc(as('mallory'), 'users/mallory'), {
        uid: 'mallory',
        email: 'm@test.com',
        role: 'facilitator',
        createdAt: new Date(),
        updatedAt: new Date(),
        _schemaVersion: 1,
      })
    )
  })

  it('a facilitator can read student profiles for the register', async () => {
    await assertSucceeds(getDoc(doc(as('fac'), 'users/alice')))
  })

  it("a student cannot read another student's profile", async () => {
    await assertFails(getDoc(doc(as('alice'), 'users/bob')))
  })
})
