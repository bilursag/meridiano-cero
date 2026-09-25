import { after } from 'next/server'
import type { AnnouncementType, NotificationType, TripStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import { describeUsers } from '@/lib/api/clerk-users'
import { tripStatusLabels } from '@/lib/labels'

// Only what happens outside the admin panel is worth a notification — admins
// already get a toast for their own actions, so notifying those would be noise.

// INFO announcements (every itinerary transition) are deliberately left out.
const NOTIFICATION_BY_ANNOUNCEMENT: Partial<
  Record<AnnouncementType, { type: NotificationType; titlePrefix: string }>
> = {
  ALERT: { type: 'TRIP_ALERT', titlePrefix: 'Alerta' },
  ACHIEVEMENT: { type: 'TRIP_ACHIEVEMENT', titlePrefix: 'Logro' },
}

const RECENT_NOTIFICATIONS_LIMIT = 30

async function findTripName(tripId: string) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { name: true } })
  return trip?.name ?? null
}

/** Runs a notification side effect after the response is sent, so a failure never breaks the request that triggered it. */
export function notifyInBackground(task: () => Promise<unknown>) {
  after(async () => {
    try {
      await task()
    } catch (error) {
      console.error('[notifications]', error)
    }
  })
}

export async function notifyAnnouncement(
  tripId: string,
  announcement: { type: AnnouncementType; title: string; authorName: string }
) {
  const mapping = NOTIFICATION_BY_ANNOUNCEMENT[announcement.type]
  if (!mapping) return

  const tripName = await findTripName(tripId)
  if (!tripName) return

  await prisma.notification.create({
    data: {
      type: mapping.type,
      tripId,
      title: `${mapping.titlePrefix} en ${tripName}`,
      body: `${announcement.authorName}: ${announcement.title}`,
    },
  })
}

export async function notifyMonitorJoined(tripId: string, clerkUserId: string) {
  const [tripName, users] = await Promise.all([findTripName(tripId), describeUsers([clerkUserId])])
  if (!tripName) return

  const name = users.get(clerkUserId)?.name ?? 'Un coordinador'
  await prisma.notification.create({
    data: {
      type: 'MONITOR_JOINED',
      tripId,
      title: `Nuevo coordinador en ${tripName}`,
      body: `${name} se unió al grupo como coordinador.`,
    },
  })
}

export async function notifyTripStatusChanged(trip: { id: string; name: string }, status: TripStatus) {
  await prisma.notification.create({
    data: {
      type: 'TRIP_STATUS_CHANGED',
      tripId: trip.id,
      title: `Cambio de estado en ${trip.name}`,
      body: `El coordinador marcó el grupo como «${tripStatusLabels[status]}».`,
    },
  })
}

/** The shared feed plus how many of those items this admin hasn't seen yet. */
export async function getAdminNotifications(clerkUserId: string) {
  const admin = await prisma.adminUser.findUnique({
    where: { clerkUserId },
    select: { createdAt: true, notificationsSeenAt: true },
  })
  // A brand-new admin starts with an empty badge instead of the whole history as unread.
  const seenAt = admin?.notificationsSeenAt ?? admin?.createdAt ?? new Date()

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: RECENT_NOTIFICATIONS_LIMIT }),
    prisma.notification.count({ where: { createdAt: { gt: seenAt } } }),
  ])

  return { notifications, unreadCount, seenAt }
}

export async function markAdminNotificationsSeen(clerkUserId: string) {
  await prisma.adminUser.update({
    where: { clerkUserId },
    data: { notificationsSeenAt: new Date() },
  })
}
