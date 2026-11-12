import type { ItineraryStatus, TripStatus } from '@prisma/client'

/**
 * How long a trip stays open after its last day begins (endDate is that day's Chile midnight):
 * the last day plus the way home overnight, so until noon of the next day. The scheduled job
 * closes the trip after it, and background tracking accepts locations for the same window.
 */
export const TRIP_OPEN_AFTER_END_MS = 36 * 60 * 60 * 1000

/**
 * The group's status implied by the coordinator's activity button: "En ruta" (IN_TRANSIT, or
 * PENDING from app versions before that status existed) means the group is moving to the
 * activity, "En actividad" (IN_PROGRESS) that it is there. "Terminar" leaves the group as it was
 * until the next "En ruta". A finished trip never changes.
 */
export function tripStatusAfterActivity(activityStatus: ItineraryStatus, current: TripStatus): TripStatus | null {
  if (current === 'FINISHED') return null
  const next: TripStatus | null =
    activityStatus === 'IN_TRANSIT' || activityStatus === 'PENDING'
      ? 'IN_TRANSIT'
      : activityStatus === 'IN_PROGRESS'
        ? 'IN_ACTIVITY'
        : null
  return next === current ? null : next
}
