import type { TripStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { pushToUsers, tripMemberIds } from '@/lib/push'
import { coordinatorMessagePush } from '@/lib/push-messages'

/** Trips in the field: a message "to every coordinator" goes to these. */
export const TRIPS_IN_FIELD: TripStatus[] = ['IN_TRANSIT', 'IN_ACTIVITY', 'RESTING']

export type CoordinatorMessageResult = { trips: number; coordinators: number; devices: number }

/**
 * Sends the central team's message as a push to the coordinators of one trip, or of every trip in
 * the field when no trip is given, and leaves one entry in the panel's feed saying what went out
 * and how far it reached. A coordinator of several trips gets one push per trip, each naming it.
 */
export async function sendCoordinatorMessage(input: {
  tripId?: string
  title: string
  message: string
  senderName: string
}): Promise<CoordinatorMessageResult> {
  const trips = input.tripId
    ? await prisma.trip.findMany({ where: { id: input.tripId }, select: { id: true, name: true, status: true } })
    : await prisma.trip.findMany({
        where: { status: { in: TRIPS_IN_FIELD } },
        select: { id: true, name: true, status: true },
        orderBy: { name: 'asc' },
      })

  if (input.tripId) {
    const [trip] = trips
    if (!trip) throw new ApiError('NOT_FOUND', 'No encontramos este grupo.')
    if (trip.status === 'FINISHED') throw new ApiError('VALIDATION_ERROR', 'La gira ya terminó: no hay coordinadores en terreno.')
  } else if (!trips.length) {
    throw new ApiError('VALIDATION_ERROR', 'No hay giras en curso (En ruta, En actividad o Descansando).')
  }

  const coordinators = new Set<string>()
  let devices = 0
  for (const trip of trips) {
    const monitors = await tripMemberIds(trip.id, ['MONITOR'])
    monitors.forEach((id) => coordinators.add(id))
    const { sent } = await pushToUsers(monitors, coordinatorMessagePush(trip, input))
    devices += sent
  }

  const result = { trips: trips.length, coordinators: coordinators.size, devices }
  const scope = input.tripId ? trips[0].name : `${trips.length} ${trips.length === 1 ? 'gira' : 'giras'} en curso`
  await prisma.notification.create({
    data: {
      type: 'COORDINATOR_MESSAGE',
      title: `Aviso a coordinadores: ${input.title}`,
      body: `${scope} · ${input.message.trim()} · Enviado por ${input.senderName}: llegó a ${devices} ${
        devices === 1 ? 'teléfono' : 'teléfonos'
      } de ${coordinators.size} ${coordinators.size === 1 ? 'coordinador' : 'coordinadores'}.`,
      tripId: input.tripId ?? null,
    },
  })
  return result
}
