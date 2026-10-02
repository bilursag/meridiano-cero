import { auth } from '@clerk/nextjs/server'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'

async function requireClerkUserId(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new ApiError('UNAUTHENTICATED', 'Debes iniciar sesión.')
  return userId
}

/** Any signed-in user, regardless of trip membership or admin status. */
export async function requireAuthenticated() {
  const clerkUserId = await requireClerkUserId()
  return { clerkUserId }
}

/** Admin can write to any trip; otherwise the caller must hold one of the given roles on it. */
export async function requireTripWrite(tripId: string, roles: Role[]) {
  const clerkUserId = await requireClerkUserId()

  const admin = await prisma.adminUser.findUnique({ where: { clerkUserId } })
  if (admin) return { clerkUserId, role: 'ADMIN' as const }

  const membership = await prisma.tripMembership.findFirst({
    where: { clerkUserId, tripId, role: { in: roles } },
  })
  if (!membership) throw new ApiError('FORBIDDEN', 'No tienes acceso a este grupo.')

  return { clerkUserId, role: membership.role }
}

export async function requireAdmin() {
  const clerkUserId = await requireClerkUserId()

  const admin = await prisma.adminUser.findUnique({ where: { clerkUserId } })
  if (!admin) throw new ApiError('FORBIDDEN', 'Se requiere acceso de administrador.')

  return { clerkUserId }
}

/** Admin can view any trip; otherwise the caller must have some membership on it. */
export async function requireTripAccess(tripId: string) {
  const clerkUserId = await requireClerkUserId()

  const admin = await prisma.adminUser.findUnique({ where: { clerkUserId } })
  if (admin) return { clerkUserId, role: 'ADMIN' as const }

  const membership = await prisma.tripMembership.findFirst({ where: { clerkUserId, tripId } })
  if (!membership) throw new ApiError('FORBIDDEN', 'No tienes acceso a este grupo.')

  return { clerkUserId, role: membership.role }
}
