import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'
import { findUserIdByEmail, inviteBodySchema, sendInvitation } from '@/lib/api/clerk-invitations'

/**
 * Adds a student to this trip by email. An existing account joins right away; otherwise Clerk
 * emails an invitation that /redeem claims. Inviting the same email again resends it.
 */
export const POST = withApiHandler<{ tripId: string }>(async (request, { params }) => {
  await requireAdmin()
  const { tripId } = await params

  const trip = await prisma.trip.findUnique({ where: { id: tripId } })
  if (!trip) throw new ApiError('NOT_FOUND', 'No se encontró el grupo.')

  const json = await request.json().catch(() => null)
  const parsed = inviteBodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Ingresa un correo válido.')
  const { emailAddress } = parsed.data

  const client = await clerkClient()
  const existingUserId = await findUserIdByEmail(client, emailAddress)

  if (existingUserId) {
    const { count: created } = await prisma.tripMembership.createMany({
      data: { clerkUserId: existingUserId, tripId, role: Role.STUDENT },
      skipDuplicates: true,
    })
    if (created === 0) throw new ApiError('VALIDATION_ERROR', 'Ese correo ya es alumno de este grupo.')
    return NextResponse.json({ result: 'added', clerkUserId: existingUserId }, { status: 201 })
  }

  const { invitation, resent } = await sendInvitation(client, {
    emailAddress,
    origin: new URL(request.url).origin,
    publicMetadata: { pendingTripInvite: { tripId, role: Role.STUDENT } },
  })
  return NextResponse.json({ result: 'invited', resent, invitation }, { status: 201 })
})
