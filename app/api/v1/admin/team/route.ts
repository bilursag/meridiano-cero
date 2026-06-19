import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'

async function describeUser(clerkUserId: string) {
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(clerkUserId)
    return {
      clerkUserId,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Sin nombre',
      email: user.emailAddresses[0]?.emailAddress ?? '',
      imageUrl: user.imageUrl,
    }
  } catch {
    return { clerkUserId, name: 'Usuario no encontrado', email: '', imageUrl: '' }
  }
}

export async function GET() {
  try {
    const { clerkUserId: currentUserId } = await requireAdmin()

    const [adminUsers, monitorMemberships] = await Promise.all([
      prisma.adminUser.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.tripMembership.findMany({
        where: { role: 'MONITOR' },
        include: { trip: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    const monitorsByUser = new Map<string, { trips: { id: string; name: string }[] }>()
    for (const membership of monitorMemberships) {
      const entry = monitorsByUser.get(membership.clerkUserId) ?? { trips: [] }
      entry.trips.push(membership.trip)
      monitorsByUser.set(membership.clerkUserId, entry)
    }

    const [admins, monitors] = await Promise.all([
      Promise.all(
        adminUsers.map(async (admin) => ({
          ...(await describeUser(admin.clerkUserId)),
          createdAt: admin.createdAt,
          isCurrentUser: admin.clerkUserId === currentUserId,
        }))
      ),
      Promise.all(
        Array.from(monitorsByUser.entries()).map(async ([clerkUserId, { trips }]) => ({
          ...(await describeUser(clerkUserId)),
          trips,
        }))
      ),
    ])

    return NextResponse.json({ admins, monitors })
  } catch (error) {
    return handleApiError(error)
  }
}
