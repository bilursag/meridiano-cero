import { NextResponse } from 'next/server'
import { z } from 'zod'
import { del } from '@vercel/blob'
import { ItineraryStatus, Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireTripWrite } from '@/lib/api/require-role'
import { findItineraryItem } from '@/lib/api/itinerary'
import { withApiHandler } from '@/lib/api/handler'
import { tripStatusAfterActivity } from '@/lib/trip-status'

const bodySchema = z.object({
  status: z.enum(ItineraryStatus).optional(),
  dayNumber: z.number().int().min(1).optional(),
  time: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).optional(),
  location: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  order: z.number().int().nonnegative().optional(),
  requirementsMessage: z.string().trim().min(1).nullable().optional(),
  // Only cleared, to undo "Enviar requisitos"; sending goes through ./requirements.
  requirementsSentAt: z.null().optional(),
})

export const PATCH = withApiHandler<{ tripId: string; itemId: string }>(async (request, { params }) => {
  const { tripId, itemId } = await params
  await requireTripWrite(tripId, [Role.MONITOR])

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Los cambios de la actividad no son válidos.')
  if (Object.keys(parsed.data).length === 0) throw new ApiError('VALIDATION_ERROR', 'No hay cambios para guardar.')

  await findItineraryItem(tripId, itemId)

  // The coordinator's "En ruta" / "En actividad" buttons also move the whole group between those statuses.
  const trip = parsed.data.status
    ? await prisma.trip.findUnique({ where: { id: tripId }, select: { status: true } })
    : null
  const tripStatus = trip && parsed.data.status ? tripStatusAfterActivity(parsed.data.status, trip.status) : null

  const [updated] = await prisma.$transaction([
    prisma.itineraryItem.update({ where: { id: itemId }, data: parsed.data }),
    ...(tripStatus ? [prisma.trip.update({ where: { id: tripId }, data: { status: tripStatus } })] : []),
  ])

  return NextResponse.json({ item: updated })
})

export const DELETE = withApiHandler<{ tripId: string; itemId: string }>(async (_request, { params }) => {
  const { tripId, itemId } = await params
  await requireTripWrite(tripId, [Role.MONITOR])

  const item = await findItineraryItem(tripId, itemId)
  if (item.photoUrl) {
    await del(item.photoUrl).catch(() => {})
  }

  await prisma.itineraryItem.delete({ where: { id: itemId } })

  return NextResponse.json({ ok: true })
})
