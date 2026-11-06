import type { ItineraryStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import { pushToUsers, tripMemberIds } from '@/lib/push'
import { activityPush, announcementPush, noSignalPush } from '@/lib/push-messages'

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

/** The coordinator started heading to an activity or arrived: tell families and students. */
export async function pushActivity(
  tripId: string,
  item: { title: string; location: string },
  previous: ItineraryStatus,
  next: ItineraryStatus
) {
  const trip = await findTrip(tripId)
  if (!trip) return
  const content = activityPush(trip, item, previous, next)
  if (!content) return
  await pushToUsers(await tripMemberIds(tripId, ['PARENT', 'STUDENT']), content)
}

/** The no-signal alert also reaches the trip's coordinators, who can fix it on the spot. */
export async function pushNoSignal(tripId: string) {
  const trip = await findTrip(tripId)
  if (!trip) return
  await pushToUsers(await tripMemberIds(tripId, ['MONITOR']), noSignalPush(trip))
}
