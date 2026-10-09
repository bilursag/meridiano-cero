import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'
import { describeUsers } from '@/lib/api/clerk-users'

export const GET = withApiHandler(async () => {
  await requireAdmin()

  const trips = await prisma.trip.findMany({
    where: { status: { not: 'FINISHED' } },
    include: {
      school: { select: { name: true } },
      locationPings: { orderBy: { createdAt: 'desc' }, take: 1 },
      memberships: { where: { role: Role.MONITOR }, select: { clerkUserId: true } },
      // The group's current activity, by the coordinator app's rule: the first one in itinerary
      // order that isn't done yet.
      itineraryItems: {
        where: { status: { not: 'COMPLETED' } },
        orderBy: { order: 'asc' },
        take: 1,
        select: { title: true, status: true, time: true, dayNumber: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const monitorIds = trips.flatMap((trip) => trip.memberships.map((m) => m.clerkUserId))
  const users = await describeUsers(monitorIds)

  const fleet = trips.map((trip) => ({
    id: trip.id,
    name: trip.name,
    destination: trip.destination,
    status: trip.status,
    school: trip.school.name,
    salesExecutive: trip.salesExecutive,
    ping: trip.locationPings[0] ?? null,
    initialLat: trip.initialLat,
    initialLng: trip.initialLng,
    monitorNames: trip.memberships.map((m) => users.get(m.clerkUserId)?.name).filter((n): n is string => !!n),
    currentActivity: trip.itineraryItems[0] ?? null,
  }))

  return NextResponse.json({ fleet })
})
