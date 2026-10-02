import { describe, expect, it } from 'vitest'
import { chileDateKey, chileDaysBetween, chileMidnight, chileMidnightFromKey, tripDayToday } from './dates'

describe('chileMidnight', () => {
  it('is 03:00 UTC during Chilean summer time (UTC-3)', () => {
    expect(chileMidnight(2026, 1, 15).toISOString()).toBe('2026-01-15T03:00:00.000Z')
  })

  it('is 04:00 UTC during Chilean winter time (UTC-4)', () => {
    expect(chileMidnight(2026, 7, 15).toISOString()).toBe('2026-07-15T04:00:00.000Z')
  })

  it('starts at 01:00 on the day clocks spring forward at midnight', () => {
    expect(chileMidnight(2026, 9, 6).toISOString()).toBe('2026-09-06T04:00:00.000Z')
  })

  it('round-trips to the same calendar date in Chile', () => {
    for (const [y, m, d] of [[2026, 4, 4], [2026, 4, 5], [2026, 9, 5], [2026, 9, 6], [2026, 12, 31]]) {
      const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      expect(chileDateKey(chileMidnight(y, m, d))).toBe(key)
    }
  })
})

describe('chileMidnightFromKey', () => {
  it('parses a date input value', () => {
    expect(chileMidnightFromKey('2025-12-01')?.toISOString()).toBe('2025-12-01T03:00:00.000Z')
  })

  it('rejects malformed or impossible dates', () => {
    expect(chileMidnightFromKey('2025-02-30')).toBeNull()
    expect(chileMidnightFromKey('01-12-2025')).toBeNull()
    expect(chileMidnightFromKey('')).toBeNull()
  })
})

describe('chileDaysBetween', () => {
  it('counts calendar days in Chile, not 24-hour periods in UTC', () => {
    // 23:30 in Chile on Dec 1 is already Dec 2 in UTC; it is still day 0 of a trip starting Dec 1.
    const start = chileMidnight(2025, 12, 1)
    const lateEvening = new Date('2025-12-02T02:30:00.000Z')
    expect(chileDaysBetween(start, lateEvening)).toBe(0)
    expect(chileDaysBetween(start, new Date('2025-12-02T03:30:00.000Z'))).toBe(1)
  })
})

describe('tripDayToday', () => {
  const start = chileMidnight(2026, 10, 5)

  it('is 1 before the trip starts', () => {
    expect(tripDayToday(start, 7, new Date('2026-10-01T15:00:00.000Z'))).toBe(1)
  })

  it('advances with the calendar in Chile', () => {
    expect(tripDayToday(start, 7, new Date('2026-10-05T12:00:00.000Z'))).toBe(1)
    expect(tripDayToday(start, 7, new Date('2026-10-07T12:00:00.000Z'))).toBe(3)
  })

  it('stays on the last day once the trip has ended', () => {
    expect(tripDayToday(start, 7, new Date('2026-11-20T12:00:00.000Z'))).toBe(7)
  })
})
