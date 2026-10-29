'use client'

import { useMemo } from 'react'
import { where } from 'firebase/firestore'
import { useCollection } from '@/hooks/useFirestore'
import {
  getAssessmentAccessCollection,
  getAttendanceCollection,
  getWorkshopsCollection,
} from '@/lib/firebase/firestore'

// useCollection re-subscribes when the collection reference changes, so each
// reference is created once with useMemo instead of on every render.

/** Live list of workshops, ordered Module 1 to 3. */
export function useWorkshops() {
  const ref = useMemo(() => getWorkshopsCollection(), [])
  const result = useCollection(ref)
  const data = useMemo(
    () => [...result.data].sort((a, b) => a.moduleNumber - b.moduleNumber),
    [result.data]
  )
  return { ...result, data }
}

/**
 * Live attendance records. Pass a studentUid for a student's own view, because
 * the Firestore rules reject an unfiltered query from a student.
 */
export function useAttendance(studentUid?: string) {
  const ref = useMemo(() => getAttendanceCollection(), [])
  return useCollection(ref, ...(studentUid ? [where('studentUid', '==', studentUid)] : []))
}

/** Live gate results, written by the markAttendance Server Action. */
export function useAssessmentAccess(studentUid?: string) {
  const ref = useMemo(() => getAssessmentAccessCollection(), [])
  return useCollection(ref, ...(studentUid ? [where('studentUid', '==', studentUid)] : []))
}
