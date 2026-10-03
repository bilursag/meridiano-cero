import { describe, expect, it } from 'vitest'
import { chileMidnight } from './dates'
import { planTripAlerts, type TripAlertInput } from './trip-alerts'

// Saturday 3 Oct 2026, 15:00 in Chile (UTC-3).
const NOW = new Date('2026-10-03T18:00:00.000Z')
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60000)

const trip = (overrides: Partial<TripAlertInput> = {}): TripAlertInput => ({
  id: 'trip-1',
  name: 'Bariloche 4°B',
  status: 'IN_TRANSIT',
  startDate: chileMidnight(2026, 10, 1),
  endDate: chileMidnight(2026, 10, 7),
  lastPingAt: minutesAgo(5),
  hasMonitor: true,
  lastNoSignalAlertAt: null,
  hasNoMonitorAlert: false,
  ...overrides,
})

const types = (input: TripAlertInput) => planTripAlerts([input], NOW).map((alert) => alert.type)

describe('no GPS signal', () => {
  it('alerts when a moving trip has been silent for 30 minutes', () => {
    const [alert] = planTripAlerts([trip({ lastPingAt: minutesAgo(42) })], NOW)
    expect(alert).toMatchObject({ type: 'TRIP_NO_SIGNAL', tripId: 'trip-1', title: 'Sin señal GPS en Bariloche 4°B' })
    expect(alert.body).toContain('14:18')
    expect(alert.body).toContain('hace 42 min')
  })

  it('stays quiet before 30 minutes', () => {
    expect(types(trip({ lastPingAt: minutesAgo(29) }))).toEqual([])
  })

  it('ignores resting or finished trips', () => {
    expect(types(trip({ status: 'RESTING', lastPingAt: minutesAgo(300) }))).toEqual([])
    expect(types(trip({ status: 'FINISHED', lastPingAt: minutesAgo(300) }))).toEqual([])
  })

  it('ignores trips outside their dates', () => {
    const ended = trip({ startDate: chileMidnight(2026, 9, 20), endDate: chileMidnight(2026, 9, 25), lastPingAt: chileMidnight(2026, 9, 25) })
    expect(types(ended)).toEqual([])
  })

  it('does not treat a trip that never transmitted on this trip as an outage', () => {
    expect(types(trip({ lastPingAt: null }))).toEqual([])
    expect(types(trip({ lastPingAt: chileMidnight(2026, 9, 1) }))).toEqual([])
  })

  it('alerts once per outage, and again after the signal came back and dropped', () => {
    expect(types(trip({ lastPingAt: minutesAgo(90), lastNoSignalAlertAt: minutesAgo(50) }))).toEqual([])
    expect(types(trip({ lastPingAt: minutesAgo(40), lastNoSignalAlertAt: minutesAgo(120) }))).toEqual(['TRIP_NO_SIGNAL'])
  })
})

describe('no coordinator', () => {
  const upcoming = (startDay: number, overrides: Partial<TripAlertInput> = {}) =>
    trip({
      status: 'IN_TRANSIT',
      startDate: chileMidnight(2026, 10, startDay),
      endDate: chileMidnight(2026, 10, startDay + 5),
      lastPingAt: null,
      hasMonitor: false,
      ...overrides,
    })

  it('alerts when a trip leaves within 3 days without a coordinator', () => {
    const [alert] = planTripAlerts([upcoming(6)], NOW)
    expect(alert).toMatchObject({ type: 'TRIP_NO_MONITOR', title: 'Sin coordinador en Bariloche 4°B' })
    expect(alert.body).toBe('Parte en 3 días (6 de octubre) y aún no tiene coordinador asignado.')
  })

  it('says "mañana" and "hoy"', () => {
    expect(planTripAlerts([upcoming(4)], NOW)[0].body).toContain('Parte mañana')
    expect(planTripAlerts([upcoming(3)], NOW)[0].body).toContain('Parte hoy')
  })

  it('stays quiet further ahead, with a coordinator, once alerted, or after departure', () => {
    expect(types(upcoming(7))).toEqual([])
    expect(types(upcoming(5, { hasMonitor: true }))).toEqual([])
    expect(types(upcoming(5, { hasNoMonitorAlert: true }))).toEqual([])
    expect(types(upcoming(2))).toEqual([])
  })
})
