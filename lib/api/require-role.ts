import { auth } from '@clerk/nextjs/server'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'

async function requireClerkUserId(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new ApiError('UNAUTHENTICATED', 'You must be signed in.')
  return userId
}

export async function requireTripRole(tripId: string, roles: Role[]) {
  const clerkUserId = await requireClerkUserId()

  const membership = await prisma.tripMembership.findFirst({
    where: { clerkUserId, tripId, role: { in: roles } },
  })

  if (!membership) {
    throw new ApiError('FORBIDDEN', 'You do not have access to this trip.')
  }

  return { clerkUserId, role: membership.role }
}

export async function requireAdmin() {
  const clerkUserId = await requireClerkUserId()

  const admin = await prisma.adminUser.findUnique({ where: { clerkUserId } })
  if (!admin) throw new ApiError('FORBIDDEN', 'Admin access required.')

  return { clerkUserId }
}

/** Admin can view any trip; otherwise the caller must have some membership on it. */
export async function requireTripAccess(tripId: string) {
  const clerkUserId = await requireClerkUserId()

  const admin = await prisma.adminUser.findUnique({ where: { clerkUserId } })
  if (admin) return { clerkUserId, role: 'ADMIN' as const }

  const membership = await prisma.tripMembership.findFirst({ where: { clerkUserId, tripId } })
  if (!membership) throw new ApiError('FORBIDDEN', 'You do not have access to this trip.')

  return { clerkUserId, role: membership.role }
}
