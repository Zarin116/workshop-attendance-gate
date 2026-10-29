'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createWorkshop } from '../actions/attendance.actions'
import { useWorkshops } from '../hooks/useAttendanceData'

const MODULES = ['1', '2', '3'] as const

const createWorkshopFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters'),
  moduleNumber: z.enum(MODULES, { message: 'Pick module 1, 2 or 3' }),
  startsAt: z.string().min(1, 'Date and time are required'),
})

type CreateWorkshopFormInput = z.infer<typeof createWorkshopFormSchema>

const inputClass =
  'h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-500 focus:outline-none aria-invalid:border-red-600 aria-invalid:focus:ring-red-600 dark:border-zinc-700 dark:bg-zinc-900'

export function CreateWorkshopForm() {
  const workshops = useWorkshops()
  const taken = new Set(workshops.data.map((w) => String(w.moduleNumber)))
  const firstFree = MODULES.find((m) => !taken.has(m))

  const {
    register,
    handleSubmit,
    resetField,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateWorkshopFormInput>({
    resolver: zodResolver(createWorkshopFormSchema),
    defaultValues: { title: '', startsAt: '', moduleNumber: '1' },
  })

  // Point the module picker at the next module without a workshop.
  useEffect(() => {
    if (firstFree) setValue('moduleNumber', firstFree)
  }, [firstFree, setValue])

  // Once every module has a workshop there is nothing left to add, so the
  // register becomes the only thing on the page.
  if (workshops.loading || !firstFree) return null

  const onSubmit = async (data: CreateWorkshopFormInput) => {
    const result = await createWorkshop({
      title: data.title,
      moduleNumber: Number(data.moduleNumber),
      // datetime-local has no timezone, so convert in the browser where the
      // facilitator's timezone is known.
      startsAt: new Date(data.startsAt).toISOString(),
    })
    if (result.success) {
      toast.success('Workshop created')
      resetField('title')
      resetField('startsAt')
    } else {
      toast.error(result.error ?? 'Failed to create workshop')
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_11rem_14rem_auto] sm:items-start dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="space-y-1.5">
        <label htmlFor="title" className="block text-sm font-medium">
          Workshop title
        </label>
        <input
          id="title"
          type="text"
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
          className={inputClass}
          placeholder="e.g. Structural editing live session"
          {...register('title')}
        />
        {errors.title && (
          <p id="title-error" className="text-xs text-red-600" role="alert">
            {errors.title.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="moduleNumber" className="block text-sm font-medium">
          Module
        </label>
        <select id="moduleNumber" className={inputClass} {...register('moduleNumber')}>
          {MODULES.map((m) => (
            <option key={m} value={m} disabled={taken.has(m)}>
              Module {m}
              {taken.has(m) ? ' (added)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="startsAt" className="block text-sm font-medium">
          Date and time
        </label>
        <input
          id="startsAt"
          type="datetime-local"
          aria-invalid={!!errors.startsAt}
          aria-describedby={errors.startsAt ? 'startsAt-error' : undefined}
          className={inputClass}
          {...register('startsAt')}
        />
        {errors.startsAt && (
          <p id="startsAt-error" className="text-xs text-red-600" role="alert">
            {errors.startsAt.message}
          </p>
        )}
      </div>

      {/* Empty label row keeps the button level with the inputs when errors show */}
      <div className="space-y-1.5">
        <span aria-hidden className="hidden text-sm sm:invisible sm:block">
          Add
        </span>
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-9 w-full rounded-md bg-black px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          {isSubmitting ? 'Saving…' : 'Add workshop'}
        </button>
      </div>
    </form>
  )
}
