import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin, requireTripAccess } from '@/lib/api/require-role'
import { describeUsers } from '@/lib/api/clerk-users'
import { withApiHandler } from '@/lib/api/handler'

export const GET = withApiHandler<{ tripId: string }>(async (_request, { params }) => {
  const { tripId } = await params
  const { role } = await requireTripAccess(tripId)
  if (role !== 'ADMIN' && role !== 'MONITOR') {
    throw new ApiError('FORBIDDEN', 'Solo coordinadores y administradores pueden ver las personas del grupo.')
  }

  const memberships = await prisma.tripMembership.findMany({
    where: { tripId, role: { in: [Role.PARENT, Role.MONITOR, Role.STUDENT] } },
    orderBy: { createdAt: 'asc' },
  })

  const users = await describeUsers(memberships.map((membership) => membership.clerkUserId))
  const toRow = (membership: (typeof memberships)[number]) => ({
    id: membership.id,
    ...users.get(membership.clerkUserId)!,
  })
  const parents = memberships.filter((m) => m.role === Role.PARENT).map(toRow)
  const monitors = memberships.filter((m) => m.role === Role.MONITOR).map(toRow)
  const students = memberships.filter((m) => m.role === Role.STUDENT).map(toRow)

  return NextResponse.json({ parents, monitors, students })
})

const bodySchema = z.object({
  clerkUserId: z.string().trim().min(1),
  role: z.enum(Role),
})

/** Admin assigns an already-registered user to this trip with the given role — no code involved. */
export const POST = withApiHandler<{ tripId: string }>(async (request, { params }) => {
  await requireAdmin()
  const { tripId } = await params

  const trip = await prisma.trip.findUnique({ where: { id: tripId } })
  if (!trip) throw new ApiError('NOT_FOUND', 'No se encontró el grupo.')

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Faltan la persona o el rol.')

  const membership = await prisma.tripMembership.upsert({
    where: {
      clerkUserId_tripId_role: { clerkUserId: parsed.data.clerkUserId, tripId, role: parsed.data.role },
    },
    update: {},
    create: { clerkUserId: parsed.data.clerkUserId, tripId, role: parsed.data.role },
  })

  return NextResponse.json({ membership }, { status: 201 })
})
