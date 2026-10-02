import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireTripAccess, requireTripWrite } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'
import { dayReorderSchema } from '@/lib/api/itinerary'

export const GET = withApiHandler<{ tripId: string }>(async (_request, { params }) => {
  const { tripId } = await params
  await requireTripAccess(tripId)

  const items = await prisma.itineraryItem.findMany({
    where: { tripId },
    orderBy: { order: 'asc' },
  })

  return NextResponse.json({ items })
})

const bodySchema = z.object({
  dayNumber: z.number().int().min(1),
  time: z.string().trim().min(1),
  title: z.string().trim().min(1),
  location: z.string().trim().min(1),
  description: z.string().trim().min(1),
  order: z.number().int().nonnegative().optional(),
  requirementsMessage: z.string().trim().min(1).nullable().optional(),
})

export const POST = withApiHandler<{ tripId: string }>(async (request, { params }) => {
  const { tripId } = await params
  await requireTripWrite(tripId, [Role.MONITOR])

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Missing or invalid itinerary item fields.')

  let order = parsed.data.order
  if (order === undefined) {
    const last = await prisma.itineraryItem.findFirst({ where: { tripId }, orderBy: { order: 'desc' } })
    order = (last?.order ?? -1) + 1
  }

  const item = await prisma.itineraryItem.create({
    data: { ...parsed.data, order, tripId },
  })

  return NextResponse.json({ item }, { status: 201 })
})

// Saves a drag-and-drop move (possibly across days) atomically, so the itinerary never ends up half
// reordered if one write fails.
export const PATCH = withApiHandler<{ tripId: string }>(async (request, { params }) => {
  const { tripId } = await params
  await requireTripWrite(tripId, [Role.MONITOR])

  const json = await request.json().catch(() => null)
  const parsed = dayReorderSchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Invalid itinerary reorder payload.')
  const changes = parsed.data.items

  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { totalDays: true } })
  if (!trip) throw new ApiError('NOT_FOUND', 'Trip not found.')
  if (changes.some((change) => change.dayNumber > trip.totalDays)) {
    throw new ApiError('VALIDATION_ERROR', `Day must be between 1 and ${trip.totalDays}.`)
  }

  const ids = changes.map((change) => change.id)
  const owned = await prisma.itineraryItem.count({ where: { id: { in: ids }, tripId } })
  if (owned !== new Set(ids).size) throw new ApiError('NOT_FOUND', 'Itinerary item not found.')

  await prisma.$transaction(
    changes.map(({ id, dayNumber, order, time }) =>
      prisma.itineraryItem.update({ where: { id }, data: { dayNumber, order, time } })
    )
  )

  const items = await prisma.itineraryItem.findMany({ where: { tripId }, orderBy: { order: 'asc' } })
  return NextResponse.json({ items })
})
