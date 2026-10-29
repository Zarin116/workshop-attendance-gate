'use server'

import { revalidatePath } from 'next/cache'
import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'
import { requireAuth } from '@/actions/auth.actions'
import type { ActionResult } from '@/types'
import { evaluateGate, type GateInput } from '../gate'
import { getUserRole } from '../roles'
import { createWorkshopSchema, markAttendanceSchema } from '../schemas'

const NOT_FACILITATOR = 'Only facilitators can do this'

/** Expected failures inside the transaction that should reach the user as-is. */
class ActionError extends Error {}

/**
 * The Admin SDK skips Firestore rules, so every action checks the caller's
 * role itself before touching data.
 */
async function requireFacilitator() {
  const session = await requireAuth()
  const role = await getUserRole(session.uid)
  return role === 'facilitator' ? session : null
}

export async function createWorkshop(input: unknown): Promise<ActionResult<string>> {
  const session = await requireFacilitator()
  if (!session) return { success: false, error: NOT_FACILITATOR }

  const parsed = createWorkshopSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { title, moduleNumber, startsAt } = parsed.data
  const workshopId = `module-${moduleNumber}`
  const now = Timestamp.now()

  try {
    // create() fails if the document exists, so each module gets one workshop.
    await adminDb
      .collection('workshops')
      .doc(workshopId)
      .create({
        title,
        moduleNumber,
        startsAt: Timestamp.fromDate(new Date(startsAt)),
        createdBy: session.uid,
        createdAt: now,
        updatedAt: now,
        _schemaVersion: 1,
      })
  } catch (err) {
    if ((err as { code?: number }).code === 6) {
      return { success: false, error: `Module ${moduleNumber} already has a workshop` }
    }
    return { success: false, error: 'Failed to create workshop' }
  }

  revalidatePath('/workshops')
  return { success: true, data: workshopId }
}

export async function markAttendance(input: unknown): Promise<ActionResult> {
  const session = await requireFacilitator()
  if (!session) return { success: false, error: NOT_FACILITATOR }

  const parsed = markAttendanceSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { workshopId, studentUid, status } = parsed.data
  const workshopRef = adminDb.collection('workshops').doc(workshopId)
  const studentRef = adminDb.collection('users').doc(studentUid)
  const attendanceRef = adminDb.collection('attendance').doc(`${workshopId}_${studentUid}`)
  const accessRef = adminDb.collection('assessment_access').doc(studentUid)

  try {
    // One transaction so the attendance mark and the gate result can never
    // disagree, even if two facilitators mark the same student at once.
    await adminDb.runTransaction(async (tx) => {
      const [workshopSnap, studentSnap, accessSnap, studentRecords] = await Promise.all([
        tx.get(workshopRef),
        tx.get(studentRef),
        tx.get(accessRef),
        tx.get(adminDb.collection('attendance').where('studentUid', '==', studentUid)),
      ])

      if (!workshopSnap.exists) throw new ActionError('Workshop not found')
      if (!studentSnap.exists || studentSnap.data()?.role !== 'user') {
        throw new ActionError('Student not found')
      }

      const records: GateInput[] = studentRecords.docs
        .map((doc) => doc.data() as GateInput)
        .filter((record) => record.workshopId !== workshopId)
      records.push({ workshopId, status })
      const gate = evaluateGate(records)

      const now = Timestamp.now()
      const previousUnlockedAt = (accessSnap.data()?.unlockedAt as Timestamp | null) ?? null

      tx.set(attendanceRef, {
        workshopId,
        studentUid,
        status,
        markedBy: session.uid,
        markedAt: now,
        _schemaVersion: 1,
      })
      tx.set(accessRef, {
        studentUid,
        ...gate,
        // Keep the first unlock time. If a mark is corrected and the student
        // drops below the rule, access is taken away again.
        unlockedAt: gate.unlocked ? (previousUnlockedAt ?? now) : null,
        updatedAt: now,
        _schemaVersion: 1,
      })
    })
  } catch (err) {
    if (err instanceof ActionError) return { success: false, error: err.message }
    return { success: false, error: 'Failed to save attendance' }
  }

  revalidatePath('/assessment')
  return { success: true }
}
