import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError, handleApiError } from '@/lib/api/errors'
import { requireTripAccess } from '@/lib/api/require-role'

async function describeUser(clerkUserId: string) {
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(clerkUserId)
    return {
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Sin nombre',
      email: user.emailAddresses[0]?.emailAddress ?? '',
    }
  } catch {
    return { name: 'Usuario no encontrado', email: '' }
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params
    const { role } = await requireTripAccess(tripId)
    if (role !== 'ADMIN' && role !== 'MONITOR') {
      throw new ApiError('FORBIDDEN', 'Only monitors or admins can view the roster.')
    }

    const memberships = await prisma.tripMembership.findMany({
      where: { tripId, role: Role.PARENT },
      orderBy: { createdAt: 'asc' },
    })

    const parents = await Promise.all(
      memberships.map(async (membership) => ({
        id: membership.id,
        ...(await describeUser(membership.clerkUserId)),
      }))
    )

    return NextResponse.json({ parents })
  } catch (error) {
    return handleApiError(error)
  }
}
