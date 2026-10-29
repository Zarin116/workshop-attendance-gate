import { describe, it, expect } from 'vitest'
import { countsAsAttended, evaluateGate } from '@/features/attendance-gate/gate'

describe('countsAsAttended', () => {
  it('counts Present and Late', () => {
    expect(countsAsAttended('present')).toBe(true)
    expect(countsAsAttended('late')).toBe(true)
  })

  it('does not count Excused or Absent', () => {
    expect(countsAsAttended('excused')).toBe(false)
    expect(countsAsAttended('absent')).toBe(false)
  })
})

describe('evaluateGate', () => {
  it('is locked with no records', () => {
    expect(evaluateGate([])).toEqual({ attendedCount: 0, attendedWorkshopIds: [], unlocked: false })
  })

  it('stays locked after one attended workshop', () => {
    const result = evaluateGate([{ workshopId: 'module-1', status: 'present' }])
    expect(result.attendedCount).toBe(1)
    expect(result.unlocked).toBe(false)
  })

  it.each([
    ['module-1', 'module-2'],
    ['module-1', 'module-3'],
    ['module-2', 'module-3'],
  ])('unlocks for any two workshops (%s + %s)', (a, b) => {
    const result = evaluateGate([
      { workshopId: a, status: 'present' },
      { workshopId: b, status: 'present' },
    ])
    expect(result.unlocked).toBe(true)
    expect(result.attendedWorkshopIds).toEqual([a, b])
  })

  it('unlocks when one of the two is Late', () => {
    const result = evaluateGate([
      { workshopId: 'module-1', status: 'present' },
      { workshopId: 'module-2', status: 'late' },
    ])
    expect(result.unlocked).toBe(true)
  })

  it('stays locked when the second workshop is Excused', () => {
    const result = evaluateGate([
      { workshopId: 'module-1', status: 'present' },
      { workshopId: 'module-2', status: 'excused' },
      { workshopId: 'module-3', status: 'absent' },
    ])
    expect(result.attendedCount).toBe(1)
    expect(result.unlocked).toBe(false)
  })

  it('counts all three when the student attends every workshop', () => {
    const result = evaluateGate([
      { workshopId: 'module-3', status: 'late' },
      { workshopId: 'module-1', status: 'present' },
      { workshopId: 'module-2', status: 'present' },
    ])
    expect(result.attendedCount).toBe(3)
    expect(result.attendedWorkshopIds).toEqual(['module-1', 'module-2', 'module-3'])
  })

  it('uses the last record when a workshop is marked twice', () => {
    const result = evaluateGate([
      { workshopId: 'module-1', status: 'present' },
      { workshopId: 'module-2', status: 'present' },
      { workshopId: 'module-2', status: 'absent' },
    ])
    expect(result.attendedCount).toBe(1)
    expect(result.unlocked).toBe(false)
  })
})
