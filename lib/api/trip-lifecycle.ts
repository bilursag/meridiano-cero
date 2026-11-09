import { prisma } from '@/lib/db'
import { chileDateKey, chileMidnightFromKey } from '@/lib/dates'

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
 * Trips whose last day is over in Chile become "Finalizada", run by the scheduled job: a trip that
 * never started ("Pendiente") too. Finalizada trips leave the fleet map and never raise alerts, and
 * nothing else ever closed them. A trip already Finalizada is left as it is.
 */
export async function finishEndedTrips(now: Date = new Date()): Promise<number> {
  const { count } = await prisma.trip.updateMany({
    where: { status: { not: 'FINISHED' }, endDate: { lt: chileStartOfDay(now) } },
    data: { status: 'FINISHED' },
  })
  return count
}
