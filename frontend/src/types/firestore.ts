import type { Timestamp } from 'firebase/firestore'

/**
 * Firestore collection type definitions.
 *
 * Keep in sync with:
 *   - src/lib/firebase/firestore.ts  (typed collection exports)
 *   - firebase/firestore.rules       (security rules)
 *   - docs/FIRESTORE-SCHEMA.md       (schema documentation)
 *
 * When adding a new collection, use the /firebase-collection skill.
 */

/**
 * 'user' is a student. 'facilitator' can only be set with the Admin SDK
 * (see scripts/seed-demo.mjs), never by the client.
 */
export type UserRole = 'user' | 'facilitator'

export interface UserProfile {
  uid: string
  email: string
  displayName: string | null
  photoURL: string | null
  role: UserRole
  createdAt: Timestamp
  updatedAt: Timestamp
  _schemaVersion: 1
}

export type CreateUserProfileInput = Omit<UserProfile, 'createdAt' | 'updatedAt'>

// ── Workshop attendance gate ────────────────────────────────────────────────

export type AttendanceStatus = 'present' | 'late' | 'excused' | 'absent'

/** workshops/{workshopId} where workshopId is `module-1`, `module-2` or `module-3` */
export interface Workshop {
  id: string
  title: string
  moduleNumber: 1 | 2 | 3
  startsAt: Timestamp
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
  _schemaVersion: 1
}

/** attendance/{workshopId}_{studentUid} (one record per student per workshop) */
export interface AttendanceRecord {
  id: string
  workshopId: string
  studentUid: string
  status: AttendanceStatus
  markedBy: string
  markedAt: Timestamp
  _schemaVersion: 1
}

/** assessment_access/{studentUid}, written only by the markAttendance Server Action */
export interface AssessmentAccess {
  studentUid: string
  attendedCount: number
  attendedWorkshopIds: string[]
  unlocked: boolean
  unlockedAt: Timestamp | null
  updatedAt: Timestamp
  _schemaVersion: 1
}
