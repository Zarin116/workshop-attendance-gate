import { z } from 'zod'

export const attendanceStatusSchema = z.enum(['present', 'late', 'excused', 'absent'])

export const createWorkshopSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters'),
  moduleNumber: z.coerce
    .number()
    .int()
    .min(1, 'Pick module 1, 2 or 3')
    .max(3, 'Pick module 1, 2 or 3'),
  // ISO string. The form converts the local date and time before sending it.
  startsAt: z.iso.datetime({ message: 'Date and time are required' }),
})

export const markAttendanceSchema = z.object({
  workshopId: z.string().regex(/^module-[1-3]$/, 'Unknown workshop'),
  studentUid: z.string().min(1, 'Student is required'),
  status: attendanceStatusSchema,
})

export type CreateWorkshopInput = z.infer<typeof createWorkshopSchema>
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>

export const STATUS_LABELS: Record<z.infer<typeof attendanceStatusSchema>, string> = {
  present: 'Present',
  late: 'Late',
  excused: 'Excused',
  absent: 'Absent',
}
