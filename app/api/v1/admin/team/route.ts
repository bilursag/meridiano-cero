import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/api/require-role'
import { describeUsers } from '@/lib/api/clerk-users'
import { withApiHandler } from '@/lib/api/handler'

export const GET = withApiHandler(async () => {
  const { clerkUserId: currentUserId } = await requireAdmin()

  const [adminUsers, monitorMemberships] = await Promise.all([
    prisma.adminUser.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.tripMembership.findMany({
      where: { role: 'MONITOR' },
      include: {
        trip: {
          select: { id: true, name: true, destination: true, salesExecutive: true, school: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  type MonitorTrip = {
    membershipId: string
    id: string
    name: string
    destination: string
    salesExecutive: string | null
    school: string
  }
  const monitorsByUser = new Map<string, { trips: MonitorTrip[] }>()
  for (const membership of monitorMemberships) {
    const entry = monitorsByUser.get(membership.clerkUserId) ?? { trips: [] }
    entry.trips.push({
      membershipId: membership.id,
      id: membership.trip.id,
      name: membership.trip.name,
      destination: membership.trip.destination,
      salesExecutive: membership.trip.salesExecutive,
      school: membership.trip.school.name,
    })
    monitorsByUser.set(membership.clerkUserId, entry)
  }

  const users = await describeUsers([
    ...adminUsers.map((admin) => admin.clerkUserId),
    ...monitorsByUser.keys(),
  ])

  const admins = adminUsers.map((admin) => ({
    ...users.get(admin.clerkUserId)!,
    createdAt: admin.createdAt,
    isCurrentUser: admin.clerkUserId === currentUserId,
  }))
  const monitors = Array.from(monitorsByUser.entries()).map(([clerkUserId, { trips }]) => ({
    ...users.get(clerkUserId)!,
    trips,
  }))

  return NextResponse.json({ admins, monitors })
})
