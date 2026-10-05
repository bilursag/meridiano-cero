import type { ItineraryStatus, TripStatus } from '@prisma/client'

/**
 * The group's status implied by the coordinator's activity buttons: "En ruta" (the activity goes
 * back to PENDING) means the group is moving to it, "En actividad" (IN_PROGRESS) that it is there.
 * "Terminada" leaves the group as it was until the next "En ruta". A finished trip never changes.
 */
export function tripStatusAfterActivity(activityStatus: ItineraryStatus, current: TripStatus): TripStatus | null {
  if (current === 'FINISHED') return null
  const next: TripStatus | null =
    activityStatus === 'PENDING' ? 'IN_TRANSIT' : activityStatus === 'IN_PROGRESS' ? 'IN_ACTIVITY' : null
  return next === current ? null : next
}
