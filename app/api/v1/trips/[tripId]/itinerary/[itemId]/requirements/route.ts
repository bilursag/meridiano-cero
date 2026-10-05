import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireTripWrite } from '@/lib/api/require-role'
import { findItineraryItem } from '@/lib/api/itinerary'
import { withApiHandler } from '@/lib/api/handler'
import { notifyAnnouncement, notifyInBackground } from '@/lib/notifications'

const bodySchema = z.object({ authorName: z.string().trim().min(1) })

/**
 * First step of the coordinator's activity button: publishes the activity's requirements as a
 * comunicado and records that they went out, so the button moves on to "En ruta".
 */
export const POST = withApiHandler<{ tripId: string; itemId: string }>(async (request, { params }) => {
  const { tripId, itemId } = await params
  const { role } = await requireTripWrite(tripId, [Role.MONITOR])

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Falta el autor del comunicado.')

  const item = await findItineraryItem(tripId, itemId)
  if (!item.requirementsMessage) throw new ApiError('VALIDATION_ERROR', 'Esta actividad no tiene requisitos.')

  const [announcement, updated] = await prisma.$transaction([
    prisma.announcement.create({
      data: {
        tripId,
        title: `Requisitos: ${item.title}`,
        message: item.requirementsMessage,
        authorName: parsed.data.authorName,
        type: 'INFO',
      },
    }),
    prisma.itineraryItem.update({ where: { id: itemId }, data: { requirementsSentAt: new Date() } }),
  ])

  if (role !== 'ADMIN') notifyInBackground(() => notifyAnnouncement(tripId, announcement))

  return NextResponse.json({ announcement, item: updated }, { status: 201 })
})
