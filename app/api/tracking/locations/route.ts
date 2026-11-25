import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { withApiHandler } from '@/lib/api/handler'
import { requireTrackingToken } from '@/lib/api/tracking-token'
import { pingBatchSchema, planPingBatch, tripAcceptsTracking } from '@/lib/location-batch'
import { startPendingTripOnLocation } from '@/lib/api/trip-lifecycle'

/**
 * Locations from the coordinator's background tracking, authenticated with the trip's tracking
 * token (outside /api/v1, whose proxy demands a Clerk session). The phone queues points while
 * offline and sends them oldest first. 401 and 410 tell it to stop tracking.
 */
export const POST = withApiHandler(async (request) => {
  const token = await requireTrackingToken(request)
  const now = new Date()
  if (!tripAcceptsTracking(token.trip, now)) {
    throw new ApiError('GONE', 'La gira terminó: la transmisión de ubicación se detuvo.')
  }

  const json = await request.json().catch(() => null)
  const parsed = pingBatchSchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Las ubicaciones enviadas no son válidas.', parsed.error)

  const tripId = token.trip.id
  const last = await prisma.locationPing.findFirst({
    where: { tripId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })
  const pings = planPingBatch(parsed.data.points, last?.createdAt ?? null, now)

  await prisma.$transaction([
    prisma.locationPing.createMany({ data: pings.map((ping) => ({ tripId, ...ping })) }),
    prisma.trackingToken.update({ where: { id: token.id }, data: { lastUsedAt: now } }),
  ])
  // Like the single-ping endpoint: the coordinator's location during the trip's dates starts a
  // trip still "Pendiente". The newest stored fix decides, since a queued batch can span midnight.
  const newest = pings.at(-1)
  if (newest) await startPendingTripOnLocation(tripId, newest.createdAt)

  return NextResponse.json({ received: parsed.data.points.length, stored: pings.length }, { status: 201 })
})
