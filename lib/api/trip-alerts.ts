import { addDays } from 'date-fns'
import { prisma } from '@/lib/db'
import { NO_MONITOR_DAYS_BEFORE, planTripAlerts, type TripAlertInput } from '@/lib/trip-alerts'
import { pushNoSignal } from '@/lib/push-triggers'

/** Loads the trips that could need an alert now, creates the due notifications and returns them. */
export async function runTripAlerts(now: Date = new Date()) {
  const trips = await prisma.trip.findMany({
    where: {
      status: { not: 'FINISHED' },
      // In the field now, or leaving within the "no coordinator" window (a day of slack each side).
      endDate: { gte: addDays(now, -1) },
      startDate: { lte: addDays(now, NO_MONITOR_DAYS_BEFORE + 1) },
    },
    select: {
      id: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      locationPings: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
      memberships: { where: { role: 'MONITOR' }, take: 1, select: { id: true } },
      notifications: {
        where: { type: { in: ['TRIP_NO_SIGNAL', 'TRIP_NO_MONITOR'] } },
        orderBy: { createdAt: 'desc' },
        select: { type: true, createdAt: true },
      },
    },
  })

  const inputs: TripAlertInput[] = trips.map((trip) => ({
    id: trip.id,
    name: trip.name,
    status: trip.status,
    startDate: trip.startDate,
    endDate: trip.endDate,
    lastPingAt: trip.locationPings[0]?.createdAt ?? null,
    hasMonitor: trip.memberships.length > 0,
    lastNoSignalAlertAt: trip.notifications.find((n) => n.type === 'TRIP_NO_SIGNAL')?.createdAt ?? null,
    hasNoMonitorAlert: trip.notifications.some((n) => n.type === 'TRIP_NO_MONITOR'),
  }))

  const alerts = planTripAlerts(inputs, now)
  if (alerts.length) await prisma.notification.createMany({ data: alerts })

  // The panel's feed is the record; the push to the coordinators is best effort.
  for (const alert of alerts) {
    if (alert.type !== 'TRIP_NO_SIGNAL') continue
    await pushNoSignal(alert.tripId).catch((error) => console.error('[push] no-signal', error))
  }
  return { checked: trips.length, alerts }
}
