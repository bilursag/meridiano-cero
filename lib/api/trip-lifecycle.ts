import { prisma } from '@/lib/db'
import { chileDateKey, chileMidnightFromKey } from '@/lib/dates'
import { TRIP_OPEN_AFTER_END_MS } from '@/lib/trip-status'

/** The first instant of the given moment's calendar date in Chile. */
export function chileStartOfDay(at: Date): Date {
  return chileMidnightFromKey(chileDateKey(at))!
}

/**
 * The coordinator's location, received during the trip's own dates, starts a trip still
 * "Pendiente": the group is out, even if nobody has pressed "En ruta" yet (and only moving trips
 * raise "sin señal"). One conditional write, so a trip already started is never touched.
 * Trip dates are stored as Chile midnight of the first and last day.
 */
export async function startPendingTripOnLocation(tripId: string, at: Date = new Date()): Promise<boolean> {
  const { count } = await prisma.trip.updateMany({
    where: { id: tripId, status: 'PENDING', startDate: { lte: at }, endDate: { gte: chileStartOfDay(at) } },
    data: { status: 'IN_TRANSIT' },
  })
  return count > 0
}

/**
 * Trips past their open window (TRIP_OPEN_AFTER_END_MS: noon in Chile the day after the last one,
 * so an overnight way home stays on the map) become "Finalizada", run by the scheduled job: a
 * trip that never started ("Pendiente") too. Finalizada trips leave the fleet map, stop taking
 * locations and never raise alerts. A trip already Finalizada is left as it is.
 */
export async function finishEndedTrips(now: Date = new Date()): Promise<number> {
  const { count } = await prisma.trip.updateMany({
    where: { status: { not: 'FINISHED' }, endDate: { lt: new Date(now.getTime() - TRIP_OPEN_AFTER_END_MS) } },
    data: { status: 'FINISHED' },
  })
  return count
}
