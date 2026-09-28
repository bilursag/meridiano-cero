import type { NotificationType } from '@prisma/client'

/** Tabs of the admin trip page that can be opened directly with `?tab=`. */
export const TRIP_TABS = ['resumen', 'itinerario', 'comunicados', 'personas'] as const
export type TripTab = (typeof TRIP_TABS)[number]

export function isTripTab(value: string | null): value is TripTab {
  return TRIP_TABS.includes(value as TripTab)
}

const TAB_BY_TYPE: Partial<Record<NotificationType, TripTab>> = {
  TRIP_ALERT: 'comunicados',
  TRIP_ACHIEVEMENT: 'comunicados',
  MONITOR_JOINED: 'personas',
}

/** Where a notification leads: the trip page, on the tab where the change shows up. Null when it isn't tied to a trip. */
export function notificationHref(notification: { type: NotificationType; tripId: string | null }) {
  if (!notification.tripId) return null
  const tab = TAB_BY_TYPE[notification.type]
  return `/admin/trips/${notification.tripId}${tab ? `?tab=${tab}` : ''}`
}
