/**
 * Calendar dates for trips, always in Chile's time zone.
 *
 * Trips are stored as the instant of local midnight in Santiago (what a date picker in a Chilean
 * browser produces). The server runs in UTC, so anything that turns a calendar date into an instant,
 * or asks "which day is today", must go through these helpers rather than `new Date()` arithmetic.
 */

export const CHILE_TIME_ZONE = 'America/Santiago'

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CHILE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** "YYYY-MM-DD" of the given instant, as a calendar date in Chile. */
export function chileDateKey(date: Date): string {
  return dateKeyFormatter.format(date)
}

/** Minutes Chile is ahead of UTC at the given instant (negative: -180 in summer, -240 in winter). */
function chileOffsetMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CHILE_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((part) => part.type === type)!.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'))
  return Math.round((asUtc - date.getTime()) / 60000)
}

/**
 * The first instant of the given calendar date in Chile (month is 1-based): 00:00, or 01:00 on the
 * day clocks spring forward at midnight and 00:00 does not exist.
 */
export function chileMidnight(year: number, month: number, day: number): Date {
  const utcMidnight = Date.UTC(year, month - 1, day)
  const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const noon = (offsetDays: number) => new Date(utcMidnight + (offsetDays * 24 + 12) * 60 * 60 * 1000)
  // Midnight takes the offset of either that day or the day before (clocks change at midnight), so
  // try both and keep the earliest instant that already falls on the requested date.
  const candidates = [noon(0), noon(-1)]
    .map((reference) => new Date(utcMidnight - chileOffsetMinutes(reference) * 60 * 1000))
    .filter((candidate) => chileDateKey(candidate) === key)
    .sort((a, b) => a.getTime() - b.getTime())
  return candidates[0] ?? new Date(utcMidnight)
}

/** Chile midnight for a "YYYY-MM-DD" string, or null when it is not a valid date. */
export function chileMidnightFromKey(key: string): Date | null {
  const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const date = chileMidnight(Number(match[1]), Number(match[2]), Number(match[3]))
  return chileDateKey(date) === key ? date : null
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Whole calendar days from `from` to `to`, counting dates in Chile. */
export function chileDaysBetween(from: Date, to: Date): number {
  const toUtcDay = (date: Date) => {
    const [year, month, day] = chileDateKey(date).split('-').map(Number)
    return Date.UTC(year, month - 1, day)
  }
  return Math.round((toUtcDay(to) - toUtcDay(from)) / DAY_MS)
}

/**
 * Which day of the trip it is today in Chile: 1 before it starts, `totalDays` once it has ended.
 * Derived on every read (see lib/db.ts) because nothing ever advanced the stored column.
 */
export function tripDayToday(startDate: Date, totalDays: number, now: Date = new Date()): number {
  const day = chileDaysBetween(startDate, now) + 1
  return Math.min(Math.max(day, 1), Math.max(totalDays, 1))
}
