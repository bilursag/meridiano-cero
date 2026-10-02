import { NextResponse } from 'next/server'
import { z } from 'zod'
import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

const bodySchema = z.object({ emailAddress: z.email() })

export const POST = withApiHandler<{ tripId: string }>(async (request, { params }) => {
  await requireAdmin()
  const { tripId } = await params

  const trip = await prisma.trip.findUnique({ where: { id: tripId } })
  if (!trip) throw new ApiError('NOT_FOUND', 'No se encontró el grupo.')

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Ingresa un correo válido.')

  const client = await clerkClient()
  const invitation = await client.invitations.createInvitation({
    emailAddress: parsed.data.emailAddress,
    redirectUrl: `${new URL(request.url).origin}/redeem`,
    notify: true,
    publicMetadata: { pendingTripInvite: { tripId, role: 'STUDENT' } },
  })

  return NextResponse.json({ invitation }, { status: 201 })
})
