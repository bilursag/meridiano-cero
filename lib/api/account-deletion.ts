import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'

/** Clerk answers 404 when the user is already gone, e.g. a retry after a commit that failed late. */
function isClerkNotFound(error: unknown) {
  return typeof error === 'object' && error !== null && (error as { status?: unknown }).status === 404
}

/**
 * Deletes someone's account: their own rows first (trip memberships, redeem attempts, admin
 * access, push devices, tracking tokens), then the Clerk user. The group's data stays: trips, photos, announcements and location
 * pings belong to the trip, not to the person, and the school keeps them (see /privacidad).
 *
 * Clerk is called inside the database transaction, so if Clerk fails the rows are rolled back and
 * the person can simply try again with their account intact.
 */
export async function deleteAccount(clerkUserId: string) {
  const admin = await prisma.adminUser.findUnique({ where: { clerkUserId } })
  if (admin && (await prisma.adminUser.count()) <= 1) {
    throw new ApiError(
      'FORBIDDEN',
      'Eres el único administrador. Invita a otra persona como administradora antes de eliminar tu cuenta.'
    )
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.tripMembership.deleteMany({ where: { clerkUserId } })
      await tx.redeemAttempt.deleteMany({ where: { clerkUserId } })
      await tx.adminUser.deleteMany({ where: { clerkUserId } })
      // The phone's push identifier and the coordinator's background tracking tokens.
      await tx.pushDevice.deleteMany({ where: { clerkUserId } })
      await tx.trackingToken.deleteMany({ where: { clerkUserId } })

      const client = await clerkClient()
      try {
        await client.users.deleteUser(clerkUserId)
      } catch (error) {
        if (!isClerkNotFound(error)) throw error
      }
    },
    { timeout: 15_000 }
  )
}
