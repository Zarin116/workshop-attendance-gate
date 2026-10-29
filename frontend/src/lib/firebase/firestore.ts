import { collection, doc, type CollectionReference, type DocumentData } from 'firebase/firestore'
import { getClientDb } from './client'
import type { AssessmentAccess, AttendanceRecord, UserProfile, Workshop } from '@/types/firestore'

/**
 * Creates a typed Firestore collection reference.
 * Use this factory to add new collections — see docs/FIRESTORE-SCHEMA.md
 */
function typedCollection<T extends DocumentData>(path: string): CollectionReference<T> {
  return collection(getClientDb(), path) as CollectionReference<T>
}

// ── Collections ──────────────────────────────────────────────────────────────
// Add one export per Firestore collection. Keep in sync with:
//   - src/types/firestore.ts
//   - firebase/firestore.rules
//   - docs/FIRESTORE-SCHEMA.md

export function getUsersCollection() {
  return typedCollection<UserProfile>('users')
}

export function userDoc(uid: string) {
  return doc(getUsersCollection(), uid)
}

export function getWorkshopsCollection() {
  return typedCollection<Workshop>('workshops')
}

export function getAttendanceCollection() {
  return typedCollection<AttendanceRecord>('attendance')
}

export function getAssessmentAccessCollection() {
  return typedCollection<AssessmentAccess>('assessment_access')
}

export function assessmentAccessDoc(studentUid: string) {
  return doc(getAssessmentAccessCollection(), studentUid)
}
