import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ────────────────────────────────────────────────────────────────────
// A tiny in-memory stand-in for the Admin SDK: enough for runTransaction,
// doc().get(), doc().create() and a where('studentUid', '==', uid) query.

type Data = Record<string, unknown>
const store = new Map<string, Data>()

function docRef(path: string) {
  return {
    path,
    get: async () => snap(path),
    create: async (data: Data) => {
      if (store.has(path)) throw Object.assign(new Error('ALREADY_EXISTS'), { code: 6 })
      store.set(path, data)
    },
  }
}

function snap(path: string) {
  const data = store.get(path)
  return { exists: data !== undefined, data: () => data }
}

function collection(name: string) {
  return {
    doc: (id: string) => docRef(`${name}/${id}`),
    where: (field: string, _op: string, value: unknown) => ({
      query: () =>
        [...store.entries()]
          .filter(([path, data]) => path.startsWith(`${name}/`) && data[field] === value)
          .map(([, data]) => ({ data: () => data })),
    }),
  }
}

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: (name: string) => collection(name),
    runTransaction: async (fn: (tx: unknown) => Promise<void>) => {
      const writes: [string, Data][] = []
      await fn({
        get: async (target: { path?: string; query?: () => unknown[] }) =>
          target.query ? { docs: target.query() } : snap(target.path!),
        set: (ref: { path: string }, data: Data) => writes.push([ref.path, data]),
      })
      for (const [path, data] of writes) store.set(path, data)
    },
  },
}))

vi.mock('firebase-admin/firestore', () => ({
  Timestamp: {
    now: () => ({ seconds: 1 }),
    fromDate: (d: Date) => ({ seconds: d.getTime() / 1000 }),
  },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('server-only', () => ({}))

const session = { uid: 'facilitator-1' }
vi.mock('@/actions/auth.actions', () => ({ requireAuth: vi.fn(async () => session) }))

import { createWorkshop, markAttendance } from '@/features/attendance-gate/actions/attendance.actions'

// ── Helpers ──────────────────────────────────────────────────────────────────

function seed() {
  store.clear()
  session.uid = 'facilitator-1'
  store.set('users/facilitator-1', { role: 'facilitator' })
  store.set('users/student-1', { role: 'user' })
  store.set('workshops/module-1', { moduleNumber: 1 })
  store.set('workshops/module-2', { moduleNumber: 2 })
  store.set('workshops/module-3', { moduleNumber: 3 })
}

const mark = (workshopId: string, status: string) =>
  markAttendance({ workshopId, studentUid: 'student-1', status })

beforeEach(seed)

// ── Tests ────────────────────────────────────────────────────────────────────

describe('markAttendance', () => {
  it('saves the record and unlocks the assessment after two attended workshops', async () => {
    expect(await mark('module-1', 'present')).toEqual({ success: true })
    expect(store.get('assessment_access/student-1')).toMatchObject({
      attendedCount: 1,
      unlocked: false,
      unlockedAt: null,
    })

    expect(await mark('module-3', 'late')).toEqual({ success: true })
    expect(store.get('attendance/module-3_student-1')).toMatchObject({
      workshopId: 'module-3',
      studentUid: 'student-1',
      status: 'late',
      markedBy: 'facilitator-1',
    })
    expect(store.get('assessment_access/student-1')).toMatchObject({
      attendedCount: 2,
      attendedWorkshopIds: ['module-1', 'module-3'],
      unlocked: true,
    })
  })

  it('locks the assessment again when a mark is corrected to Absent', async () => {
    await mark('module-1', 'present')
    await mark('module-2', 'present')
    expect(store.get('assessment_access/student-1')?.unlocked).toBe(true)

    await mark('module-2', 'absent')
    expect(store.get('assessment_access/student-1')).toMatchObject({
      attendedCount: 1,
      unlocked: false,
      unlockedAt: null,
    })
  })

  it('does not count Excused towards the rule', async () => {
    await mark('module-1', 'present')
    await mark('module-2', 'excused')
    expect(store.get('assessment_access/student-1')?.unlocked).toBe(false)
  })

  it('rejects a student who tries to mark attendance', async () => {
    session.uid = 'student-1'
    const result = await mark('module-1', 'present')
    expect(result).toEqual({ success: false, error: 'Only facilitators can do this' })
    expect(store.has('attendance/module-1_student-1')).toBe(false)
    expect(store.has('assessment_access/student-1')).toBe(false)
  })

  it('rejects an unknown status', async () => {
    const result = await mark('module-1', 'sick')
    expect(result.success).toBe(false)
    expect(store.has('attendance/module-1_student-1')).toBe(false)
  })

  it('rejects a workshop that has not been created', async () => {
    store.delete('workshops/module-2')
    expect(await mark('module-2', 'present')).toEqual({
      success: false,
      error: 'Workshop not found',
    })
  })

  it('rejects marking a facilitator as a student', async () => {
    const result = await markAttendance({
      workshopId: 'module-1',
      studentUid: 'facilitator-1',
      status: 'present',
    })
    expect(result).toEqual({ success: false, error: 'Student not found' })
  })
})

describe('createWorkshop', () => {
  const input = { title: 'Copyediting basics', moduleNumber: 1, startsAt: '2026-11-03T09:00:00.000Z' }

  it('creates the workshop with a module-based id', async () => {
    store.delete('workshops/module-1')
    expect(await createWorkshop(input)).toEqual({ success: true, data: 'module-1' })
    expect(store.get('workshops/module-1')).toMatchObject({
      title: 'Copyediting basics',
      moduleNumber: 1,
      createdBy: 'facilitator-1',
    })
  })

  it('refuses a second workshop for the same module', async () => {
    expect(await createWorkshop(input)).toEqual({
      success: false,
      error: 'Module 1 already has a workshop',
    })
  })

  it('rejects a student', async () => {
    session.uid = 'student-1'
    store.delete('workshops/module-1')
    expect((await createWorkshop(input)).success).toBe(false)
    expect(store.has('workshops/module-1')).toBe(false)
  })

  it('rejects a module outside 1 to 3', async () => {
    const result = await createWorkshop({ ...input, moduleNumber: 4 })
    expect(result).toEqual({ success: false, error: 'Pick module 1, 2 or 3' })
  })
})
