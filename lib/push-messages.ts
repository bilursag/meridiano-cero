import type { ItineraryStatus } from '@prisma/client'

/**
 * What the app does when the notification is tapped: open that trip's screen for the reader's
 * role. Kept as data (not a URL) because one trip shows different tabs to a parent and a coordinator.
 */
export type PushTarget =
  | { screen: 'announcement'; tripId: string; announcementId: string }
  | { screen: 'itinerary'; tripId: string }
  | { screen: 'home'; tripId: string }

export type PushContent = { title: string; body: string; target: PushTarget }

const MAX_BODY = 180

function clip(text: string) {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > MAX_BODY ? `${flat.slice(0, MAX_BODY - 1)}…` : flat
}

const ANNOUNCEMENT_PREFIX: Record<string, string> = {
  ALERT: 'Alerta',
  ACHIEVEMENT: 'Logro',
}

/** A new comunicado for the trip's families and students (and the other coordinators). */
export function announcementPush(
  trip: { id: string; name: string },
  announcement: { id: string; type: string; title: string; message: string }
): PushContent {
  const prefix = ANNOUNCEMENT_PREFIX[announcement.type]
  return {
    title: prefix ? `${prefix}: ${announcement.title}` : announcement.title,
    body: clip(`${trip.name} · ${announcement.message}`),
    target: { screen: 'announcement', tripId: trip.id, announcementId: announcement.id },
  }
}

/**
 * The coordinator moved an activity to "En ruta" or "En actividad". Other changes (finishing an
 * activity, editing it, undoing a step) are not worth waking anyone up for.
 */
export function activityPush(
  trip: { id: string; name: string },
  item: { title: string; location: string | null },
  previous: ItineraryStatus,
  next: ItineraryStatus
): PushContent | null {
  if (previous === next) return null
  const place = item.location ? ` (${item.location})` : ''
  if (next === 'IN_TRANSIT') {
    return {
      title: `En ruta a ${item.title}`,
      body: clip(`${trip.name}: el grupo va camino a ${item.title}${place}.`),
      target: { screen: 'itinerary', tripId: trip.id },
    }
  }
  if (next === 'IN_PROGRESS') {
    return {
      title: `Llegaron a ${item.title}`,
      body: clip(`${trip.name}: el grupo está en la actividad${place}.`),
      target: { screen: 'itinerary', tripId: trip.id },
    }
  }
  return null
}

/** For the trip's coordinators when the panel stops receiving the group's location. */
export function noSignalPush(trip: { id: string; name: string }): PushContent {
  return {
    title: 'No llega la ubicación del grupo',
    body: clip(`${trip.name}: hace un rato no recibimos la ubicación. Abre MeridianoGo para revisar que se esté compartiendo.`),
    target: { screen: 'home', tripId: trip.id },
  }
}

/**
 * An activity step for the admins, who follow every trip in the field at once: the group goes
 * first in the title, so a stack of these on the lock screen still says which group did what.
 */
export function adminActivityPush(
  trip: { id: string; name: string },
  item: { title: string; location: string | null },
  previous: ItineraryStatus,
  next: ItineraryStatus
): PushContent | null {
  const forFamilies = activityPush(trip, item, previous, next)
  if (!forFamilies) return null
  const place = item.location ? ` (${item.location})` : ''
  const heading = next === 'IN_TRANSIT'
  return {
    title: clip(`${trip.name}: ${heading ? 'en ruta a' : 'llegó a'} ${item.title}`),
    body: clip(`${heading ? 'El grupo va camino a' : 'El grupo está en'} ${item.title}${place}.`),
    target: forFamilies.target,
  }
}
