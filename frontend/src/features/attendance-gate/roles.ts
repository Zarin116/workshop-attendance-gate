import 'server-only'
import { adminDb } from '@/lib/firebase/admin'
import type { UserRole } from '@/types/firestore'

/** Reads the caller's role from users/{uid}. Missing profile means 'user'. */
export async function getUserRole(uid: string): Promise<UserRole> {
  const snap = await adminDb.collection('users').doc(uid).get()
  return snap.data()?.role === 'facilitator' ? 'facilitator' : 'user'
}

export interface StudentSummary {
  uid: string
  name: string
}

/** All students (role 'user'), sorted by name, for the facilitator register. */
export async function listStudents(): Promise<StudentSummary[]> {
  const snap = await adminDb.collection('users').where('role', '==', 'user').get()
  return snap.docs
    .map((doc) => {
      const data = doc.data()
      return { uid: doc.id, name: (data.displayName as string | null) ?? (data.email as string) }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}
