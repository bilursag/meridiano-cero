import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'
import { findUserIdByEmail, inviteBodySchema, sendInvitation } from '@/lib/api/clerk-invitations'

/**
 * Grants admin access by email. An existing account becomes admin right away; otherwise Clerk
 * emails an invitation that /redeem claims. Inviting the same email again resends it.
 */
export const POST = withApiHandler(async (request) => {
  await requireAdmin()

  const json = await request.json().catch(() => null)
  const parsed = inviteBodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Ingresa un correo válido.')
  const { emailAddress } = parsed.data

  const client = await clerkClient()
  const existingUserId = await findUserIdByEmail(client, emailAddress)

  if (existingUserId) {
    const { count: created } = await prisma.adminUser.createMany({
      data: { clerkUserId: existingUserId },
      skipDuplicates: true,
    })
    if (created === 0) throw new ApiError('VALIDATION_ERROR', 'Ese correo ya tiene acceso de administrador.')
    return NextResponse.json({ result: 'granted', clerkUserId: existingUserId }, { status: 201 })
  }

  const { invitation, resent } = await sendInvitation(client, {
    emailAddress,
    origin: new URL(request.url).origin,
    publicMetadata: { pendingAdminInvite: true },
  })
  return NextResponse.json({ result: 'invited', resent, invitation }, { status: 201 })
})
