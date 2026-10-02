import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireTripAccess } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

export const DELETE = withApiHandler<{ tripId: string; membershipId: string }>(async (_request, { params }) => {
  const { tripId, membershipId } = await params
  const { role: callerRole } = await requireTripAccess(tripId)

  const membership = await prisma.tripMembership.findUnique({ where: { id: membershipId } })
  if (!membership || membership.tripId !== tripId) {
    throw new ApiError('NOT_FOUND', 'No se encontró a esa persona en el grupo.')
  }

  if (membership.role === Role.MONITOR && callerRole !== 'ADMIN') {
    throw new ApiError('FORBIDDEN', 'Solo un administrador puede quitar a un coordinador del grupo.')
  }
  if (membership.role === Role.STUDENT && callerRole !== 'ADMIN') {
    throw new ApiError('FORBIDDEN', 'Solo un administrador puede quitar a un alumno del grupo.')
  }
  if (membership.role === Role.PARENT && callerRole !== 'ADMIN' && callerRole !== 'MONITOR') {
    throw new ApiError('FORBIDDEN', 'No tienes permiso para quitar a esta persona.')
  }

  await prisma.tripMembership.delete({ where: { id: membershipId } })

  return NextResponse.json({ ok: true })
})
