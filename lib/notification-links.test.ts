import { describe, expect, it } from 'vitest'
import { isTripTab, notificationHref } from './notification-links'

describe('notificationHref', () => {
  it('opens the announcements tab for alerts and achievements', () => {
    expect(notificationHref({ type: 'TRIP_ALERT', tripId: 't1' })).toBe('/admin/trips/t1?tab=comunicados')
    expect(notificationHref({ type: 'TRIP_ACHIEVEMENT', tripId: 't1' })).toBe('/admin/trips/t1?tab=comunicados')
  })

  it('opens the people tab when a coordinator joins', () => {
    expect(notificationHref({ type: 'MONITOR_JOINED', tripId: 't1' })).toBe('/admin/trips/t1?tab=personas')
  })

  it('opens the trip summary for status changes', () => {
    expect(notificationHref({ type: 'TRIP_STATUS_CHANGED', tripId: 't1' })).toBe('/admin/trips/t1')
  })

  it('has no destination when the notification is not tied to a trip', () => {
    expect(notificationHref({ type: 'SYSTEM_ERROR', tripId: null })).toBeNull()
  })
})

describe('isTripTab', () => {
  it('only accepts the trip page tabs', () => {
    expect(isTripTab('personas')).toBe(true)
    expect(isTripTab('admin')).toBe(false)
    expect(isTripTab(null)).toBe(false)
  })
})
