import type { NotificationType, TripStatus } from '@prisma/client'
import { CHILE_TIME_ZONE, chileDaysBetween } from '@/lib/dates'
import { tripStatusLabels } from '@/lib/labels'

/**
 * Alerts detected by the scheduled job (app/api/cron/trip-alerts), not by a request: a trip in the
 * field that stopped sending its location, and a trip about to leave without a coordinator.
 */

export const NO_SIGNAL_AFTER_MINUTES = 30
export const NO_MONITOR_DAYS_BEFORE = 3

// A resting group (night, hotel) is expected to be quiet, so only these statuses raise "no signal".
const MOVING_STATUSES: TripStatus[] = ['IN_TRANSIT', 'IN_ACTIVITY']

export type TripAlertInput = {
  id: string
  name: string
  status: TripStatus
  startDate: Date
  endDate: Date
  lastPingAt: Date | null
  hasMonitor: boolean
  lastNoSignalAlertAt: Date | null
  hasNoMonitorAlert: boolean
}

export type PlannedAlert = { type: NotificationType; tripId: string; title: string; body: string }

const timeFormatter = new Intl.DateTimeFormat('es-CL', { timeZone: CHILE_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const dateFormatter = new Intl.DateTimeFormat('es-CL', { timeZone: CHILE_TIME_ZONE, day: 'numeric', month: 'long' })

function noSignalAlert(trip: TripAlertInput, now: Date): PlannedAlert | null {
  if (!MOVING_STATUSES.includes(trip.status)) return null
  // Only during the trip's own dates, counted in Chile.
  if (chileDaysBetween(trip.startDate, now) < 0 || chileDaysBetween(now, trip.endDate) < 0) return null
  // A trip that never transmitted on this trip has no signal to lose; that is not an outage.
  if (!trip.lastPingAt || trip.lastPingAt < trip.startDate) return null
  const silentMinutes = Math.floor((now.getTime() - trip.lastPingAt.getTime()) / 60000)
  if (silentMinutes < NO_SIGNAL_AFTER_MINUTES) return null
  // One alert per outage: skip if we already alerted after the last location was received.
  if (trip.lastNoSignalAlertAt && trip.lastNoSignalAlertAt >= trip.lastPingAt) return null

  return {
    type: 'TRIP_NO_SIGNAL',
    tripId: trip.id,
    title: `Sin señal GPS en ${trip.name}`,
    body: `No llega la ubicación desde las ${timeFormatter.format(trip.lastPingAt)} (hace ${silentMinutes} min). Estado: «${tripStatusLabels[trip.status]}».`,
  }
}

function noMonitorAlert(trip: TripAlertInput, now: Date): PlannedAlert | null {
  if (trip.status === 'FINISHED' || trip.hasMonitor || trip.hasNoMonitorAlert) return null
  const daysToStart = chileDaysBetween(now, trip.startDate)
  if (daysToStart < 0 || daysToStart > NO_MONITOR_DAYS_BEFORE) return null

  const when = daysToStart === 0 ? 'hoy' : daysToStart === 1 ? 'mañana' : `en ${daysToStart} días`
  return {
    type: 'TRIP_NO_MONITOR',
    tripId: trip.id,
    title: `Sin coordinador en ${trip.name}`,
    body: `Parte ${when} (${dateFormatter.format(trip.startDate)}) y aún no tiene coordinador asignado.`,
  }
}

export function planTripAlerts(trips: TripAlertInput[], now: Date): PlannedAlert[] {
  return trips.flatMap((trip) => [noSignalAlert(trip, now), noMonitorAlert(trip, now)].filter((a) => a !== null))
}
