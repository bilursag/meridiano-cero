import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireTripWrite } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'
import { issueTrackingToken } from '@/lib/api/tracking-token'
import { tripAcceptsTracking } from '@/lib/location-batch'

/**
 * The coordinator's app asks for a tracking token when it starts sending the group's location.
 * The background task sends locations with it to /api/tracking/locations, which needs no Clerk
 * session (the app may be closed). Asking again revokes the earlier token.
 */
export const POST = withApiHandler<{ tripId: string }>(async (_request, { params }) => {
  const { tripId } = await params
  const { clerkUserId } = await requireTripWrite(tripId, [Role.MONITOR])

  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { status: true, endDate: true } })
  if (!trip) throw new ApiError('NOT_FOUND', 'No encontramos este grupo.')
  if (!tripAcceptsTracking(trip, new Date())) {
    throw new ApiError('GONE', 'La gira ya terminó: no hace falta transmitir la ubicación.')
  }

  const token = await issueTrackingToken(tripId, clerkUserId)
  return NextResponse.json({ token }, { status: 201 })
})
