import { describe, expect, it } from 'vitest'
import { chileMidnightFromKey } from '@/lib/dates'
import { endDateForDays, programLongerThanDates, tripDayCount } from './program-length'

const iso = (key: string) => chileMidnightFromKey(key)!.toISOString()

describe('tripDayCount', () => {
  it('counts both the start and the end day', () => {
    expect(tripDayCount(iso('2026-12-01'), iso('2026-12-07'))).toBe(7)
    expect(tripDayCount(iso('2026-12-01'), iso('2026-12-01'))).toBe(1)
  })

  it('is null without both dates', () => {
    expect(tripDayCount(null, iso('2026-12-01'))).toBeNull()
    expect(tripDayCount(iso('2026-12-01'), null)).toBeNull()
  })
})

describe('programLongerThanDates', () => {
  it('flags a 7-day program on a trip dated for 1 day', () => {
    expect(programLongerThanDates(iso('2026-12-01'), iso('2026-12-01'), 7)).toBe(true)
  })

  it('accepts a program that fits the dates', () => {
    expect(programLongerThanDates(iso('2026-12-01'), iso('2026-12-07'), 7)).toBe(false)
    expect(programLongerThanDates(iso('2026-12-01'), iso('2026-12-10'), 7)).toBe(false)
  })

  it('stays quiet without dates or with an end before the start (the parser reports those)', () => {
    expect(programLongerThanDates(null, null, 7)).toBe(false)
    expect(programLongerThanDates(iso('2026-12-07'), iso('2026-12-01'), 7)).toBe(false)
  })
})

describe('endDateForDays', () => {
  it('returns the Chile midnight that makes the trip last the given days', () => {
    expect(endDateForDays(iso('2026-12-01'), 7)).toBe(iso('2026-12-07'))
    expect(endDateForDays(iso('2026-12-28'), 7)).toBe(iso('2027-01-03'))
  })

  it('keeps Chile midnight across the April clock change', () => {
    expect(endDateForDays(iso('2026-04-02'), 5)).toBe(iso('2026-04-06'))
  })
})
