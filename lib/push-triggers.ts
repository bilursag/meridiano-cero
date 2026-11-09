import type { ItineraryStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import { adminIds, pushToUsers, tripMemberIds } from '@/lib/push'
import { activityPush, adminActivityPush, announcementPush, noSignalPush } from '@/lib/push-messages'

async function findTrip(tripId: string) {
  return prisma.trip.findUnique({ where: { id: tripId }, select: { id: true, name: true } })
}

/** A new comunicado: everyone on the trip except whoever wrote it. */
export async function pushAnnouncement(
  tripId: string,
  announcement: { id: string; type: string; title: string; message: string },
  authorClerkUserId: string
) {
  const trip = await findTrip(tripId)
  if (!trip) return
  const recipients = await tripMemberIds(tripId, ['PARENT', 'STUDENT', 'MONITOR'], authorClerkUserId)
  await pushToUsers(recipients, announcementPush(trip, announcement))
}

/**
 * The coordinator started heading to an activity or arrived: tell families and students, and the
 * admins (with the group's name up front). Whoever pressed the button is left out, and an admin who
 * is also a parent on the trip gets only the admin version.
 */
export async function pushActivity(
  tripId: string,
  item: { title: string; location: string },
  previous: ItineraryStatus,
  next: ItineraryStatus,
  actorClerkUserId: string
) {
  const trip = await findTrip(tripId)
  if (!trip) return
  const forFamilies = activityPush(trip, item, previous, next)
  const forAdmins = adminActivityPush(trip, item, previous, next)
  if (!forFamilies || !forAdmins) return

  const [members, admins] = await Promise.all([
    tripMemberIds(tripId, ['PARENT', 'STUDENT'], actorClerkUserId),
    adminIds(),
  ])
  const adminSet = new Set(admins)
  await Promise.all([
    pushToUsers(members.filter((id) => !adminSet.has(id)), forFamilies),
    pushToUsers(admins.filter((id) => id !== actorClerkUserId), forAdmins),
  ])
}

/** The no-signal alert also reaches the trip's coordinators, who can fix it on the spot. */
export async function pushNoSignal(tripId: string) {
  const trip = await findTrip(tripId)
  if (!trip) return
  await pushToUsers(await tripMemberIds(tripId, ['MONITOR']), noSignalPush(trip))
}
