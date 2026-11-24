import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'

export const FINISHED_TRIP_ANNOUNCEMENT_MESSAGE = 'La gira ya terminó: no se pueden publicar comunicados.'
export const FINISHED_TRIP_STEP_MESSAGE = 'La gira ya terminó: sus actividades ya no se pueden avanzar.'

/**
 * A finished trip takes no more comunicados, from anyone: the families already got the last word
 * and new posts (and their pushes) would only confuse them.
 */
export async function requireTripOpenForAnnouncements(tripId: string) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { status: true } })
  if (!trip) throw new ApiError('NOT_FOUND', 'No se encontró el grupo.')
  if (trip.status === 'FINISHED') throw new ApiError('VALIDATION_ERROR', FINISHED_TRIP_ANNOUNCEMENT_MESSAGE)
}
