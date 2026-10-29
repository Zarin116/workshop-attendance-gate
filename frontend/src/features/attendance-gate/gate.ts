import type { AttendanceStatus } from '@/types/firestore'

/** How many of the three module workshops a student must attend. */
export const REQUIRED_WORKSHOPS = 2

/**
 * Statuses that count as "attended" for the gate.
 * Late counts because the student was in the session. Excused does not,
 * because the student did not take part (a facilitator can still override
 * by marking them Present after a catch-up session).
 */
export const ATTENDED_STATUSES: readonly AttendanceStatus[] = ['present', 'late']

export interface GateInput {
  workshopId: string
  status: AttendanceStatus
}

export interface GateResult {
  attendedCount: number
  attendedWorkshopIds: string[]
  unlocked: boolean
}

export function countsAsAttended(status: AttendanceStatus): boolean {
  return ATTENDED_STATUSES.includes(status)
}

/**
 * Works out whether a student has met the "any two of three workshops" rule.
 * Pure function so the same logic is used by the Server Action and the tests.
 * If the same workshop appears twice, the last record wins.
 */
export function evaluateGate(records: GateInput[]): GateResult {
  const latestByWorkshop = new Map<string, AttendanceStatus>()
  for (const record of records) {
    latestByWorkshop.set(record.workshopId, record.status)
  }

  const attendedWorkshopIds = [...latestByWorkshop]
    .filter(([, status]) => countsAsAttended(status))
    .map(([workshopId]) => workshopId)
    .sort()

  return {
    attendedCount: attendedWorkshopIds.length,
    attendedWorkshopIds,
    unlocked: attendedWorkshopIds.length >= REQUIRED_WORKSHOPS,
  }
}
