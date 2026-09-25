import { NextResponse } from 'next/server'
import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { withApiHandler } from '@/lib/api/handler'
import { notifyInBackground, notifyMonitorJoined } from '@/lib/notifications'

type PendingTripInvite = { tripId: string; role: Role }

function isPendingTripInvite(value: unknown): value is PendingTripInvite {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PendingTripInvite).tripId === 'string' &&
    typeof (value as PendingTripInvite).role === 'string'
  )
}

/** Grants access if the signed-in user accepted an invitation created with pendingAdminInvite or pendingTripInvite metadata. */
export const POST = withApiHandler(async () => {
  const user = await currentUser()
  if (!user) throw new ApiError('UNAUTHENTICATED', 'You must be signed in.')

  const pendingAdminInvite = user.publicMetadata.pendingAdminInvite === true
  const pendingTripInvite = isPendingTripInvite(user.publicMetadata.pendingTripInvite)
    ? user.publicMetadata.pendingTripInvite
    : null

  if (!pendingAdminInvite && !pendingTripInvite) {
    return NextResponse.json({ granted: false })
  }

  if (pendingAdminInvite) {
    await prisma.adminUser.upsert({
      where: { clerkUserId: user.id },
      update: {},
      create: { clerkUserId: user.id },
    })
  }

  if (pendingTripInvite) {
    // createMany + skipDuplicates instead of upsert so we know whether this is a new membership.
    const { count: created } = await prisma.tripMembership.createMany({
      data: { clerkUserId: user.id, tripId: pendingTripInvite.tripId, role: pendingTripInvite.role },
      skipDuplicates: true,
    })

    if (created > 0 && pendingTripInvite.role === Role.MONITOR) {
      notifyInBackground(() => notifyMonitorJoined(pendingTripInvite.tripId, user.id))
    }
  }

  const remainingMetadata = { ...user.publicMetadata }
  delete remainingMetadata.pendingAdminInvite
  delete remainingMetadata.pendingTripInvite
  const client = await clerkClient()
  await client.users.updateUser(user.id, { publicMetadata: remainingMetadata })

  return NextResponse.json({ granted: true, tripId: pendingTripInvite?.tripId ?? null })
})
