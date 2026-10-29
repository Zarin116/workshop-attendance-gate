# Firestore Schema

## Overview

All collections use the typed collection pattern — see `frontend/src/lib/firebase/firestore.ts`.
Security rules are in `firebase/firestore.rules`.

When adding a new collection, use the `/firebase-collection` Claude Code skill.

## Schema versioning

Every document in every collection **must** include a `_schemaVersion` field:

```typescript
_schemaVersion: 1; // increment when doing a breaking schema change
```

This enables **lazy migration** — when a document is read, check `_schemaVersion` and migrate on the fly if it's behind current. See the `/evolve-schema` skill for the full migration workflow.

**Rules:**

- `_schemaVersion` is always `1` on creation
- Non-breaking changes (adding optional fields with defaults) keep the same version
- Breaking changes (rename, remove, type change) increment the version and require a migration function
- Never remove `_schemaVersion` from a schema

---

## `users` collection

**Path:** `/users/{userId}`
**Access:** Owner-only (user can read/write their own document; admins and facilitators can read all)

| Field            | Type                      | Required | Description                                                                                                                |
| ---------------- | ------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `uid`            | `string`                  | Yes      | Firebase Auth UID (same as document ID)                                                                                    |
| `email`          | `string`                  | Yes      | User's email address                                                                                                       |
| `displayName`    | `string \| null`          | Yes      | Display name from Auth or profile                                                                                          |
| `photoURL`       | `string \| null`          | Yes      | Profile photo URL                                                                                                          |
| `role`           | `'user' \| 'facilitator'` | Yes      | `user` is a student. Users can never change it; facilitators are set with the Admin SDK (`frontend/scripts/seed-demo.mjs`) |
| `createdAt`      | `Timestamp`               | Yes      | When the document was created                                                                                              |
| `updatedAt`      | `Timestamp`               | Yes      | When the document was last updated                                                                                         |
| `_schemaVersion` | `1`                       | Yes      | Schema version for lazy migration                                                                                          |

**Creation:** Auto-created by `AuthProvider` on first sign-in via `syncUserProfile()`.
**Deletion:** Hard-delete is disabled in security rules. Use `deletedAt` field for soft-delete.

---

<!-- Add new collection schemas below using the /firebase-collection skill -->

## Workshop attendance gate

A student unlocks the Final Assessment after attending any 2 of the 3 module
workshops. Present and Late count, Excused and Absent do not. All three
collections below are written only by the Server Actions in
`frontend/src/features/attendance-gate/actions/attendance.actions.ts`
(Admin SDK). The rules deny every client write.

### `workshops` collection

**Path:** `/workshops/{workshopId}` where `workshopId` is `module-1`, `module-2` or `module-3`
**Access:** Read if signed in. No client writes.

| Field            | Type          | Required | Description                                                  |
| ---------------- | ------------- | -------- | ------------------------------------------------------------ |
| `title`          | `string`      | Yes      | 3 to 100 characters                                          |
| `moduleNumber`   | `1 \| 2 \| 3` | Yes      | Also the document id, so a module can only have one workshop |
| `startsAt`       | `Timestamp`   | Yes      | Start date and time                                          |
| `createdBy`      | `string`      | Yes      | Facilitator uid                                              |
| `createdAt`      | `Timestamp`   | Yes      |                                                              |
| `updatedAt`      | `Timestamp`   | Yes      |                                                              |
| `_schemaVersion` | `1`           | Yes      |                                                              |

### `attendance` collection

**Path:** `/attendance/{workshopId}_{studentUid}` (one record per student per workshop, so marking again overwrites)
**Access:** Facilitators read all. A student reads only records where `studentUid` is their uid (queries must filter on `studentUid`). No client writes.

| Field            | Type                                           | Required | Description                              |
| ---------------- | ---------------------------------------------- | -------- | ---------------------------------------- |
| `workshopId`     | `string`                                       | Yes      | Points to `workshops/{workshopId}`       |
| `studentUid`     | `string`                                       | Yes      | Points to `users/{uid}` with role `user` |
| `status`         | `'present' \| 'late' \| 'excused' \| 'absent'` | Yes      |                                          |
| `markedBy`       | `string`                                       | Yes      | Facilitator uid                          |
| `markedAt`       | `Timestamp`                                    | Yes      |                                          |
| `_schemaVersion` | `1`                                            | Yes      |                                          |

### `assessment_access` collection

**Path:** `/assessment_access/{studentUid}`
**Access:** Facilitators read all. A student reads only their own. No client writes.

Recomputed from all of the student's attendance records in the same
transaction that saves a mark, so it can never drift from the register.

| Field                 | Type                | Required | Description                                                          |
| --------------------- | ------------------- | -------- | -------------------------------------------------------------------- |
| `studentUid`          | `string`            | Yes      | Same as the document id                                              |
| `attendedCount`       | `number`            | Yes      | Workshops marked Present or Late                                     |
| `attendedWorkshopIds` | `string[]`          | Yes      | Sorted ids of those workshops                                        |
| `unlocked`            | `boolean`           | Yes      | `attendedCount >= 2`                                                 |
| `unlockedAt`          | `Timestamp \| null` | Yes      | First time it unlocked. Reset to null if a correction locks it again |
| `updatedAt`           | `Timestamp`         | Yes      |                                                                      |
| `_schemaVersion`      | `1`                 | Yes      |                                                                      |
