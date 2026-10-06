import { chileDateKey, chileDaysBetween, chileMidnightFromKey } from '@/lib/dates'

/** Days a trip lasts from its start to its end date, both included (null without both dates). */
export function tripDayCount(startIso: string | null, endIso: string | null): number | null {
  if (!startIso || !endIso) return null
  return chileDaysBetween(new Date(startIso), new Date(endIso)) + 1
}

/**
 * Whether a trip's dates are shorter than its program. The program's later days would then fall
 * after the trip's end: the Organizador flags them and the parents' view shows days past the trip.
 */
export function programLongerThanDates(startIso: string | null, endIso: string | null, programDays: number) {
  const tripDays = tripDayCount(startIso, endIso)
  return tripDays !== null && tripDays >= 1 && programDays > tripDays
}

/** The end date (Chile midnight, ISO) that makes a trip starting on `startIso` last `days` days. */
export function endDateForDays(startIso: string, days: number): string | null {
  const [year, month, day] = chileDateKey(new Date(startIso)).split('-').map(Number)
  const key = new Date(Date.UTC(year, month - 1, day + days - 1)).toISOString().slice(0, 10)
  return chileMidnightFromKey(key)?.toISOString() ?? null
}
