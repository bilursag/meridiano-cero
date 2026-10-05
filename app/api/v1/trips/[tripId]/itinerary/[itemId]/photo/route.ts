import { NextResponse } from 'next/server'
import { put, del } from '@vercel/blob'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireTripWrite } from '@/lib/api/require-role'
import { findItineraryItem } from '@/lib/api/itinerary'
import { withApiHandler } from '@/lib/api/handler'

const MAX_FILE_SIZE = 8 * 1024 * 1024

export const POST = withApiHandler<{ tripId: string; itemId: string }>(async (request, { params }) => {
  const { tripId, itemId } = await params
  await requireTripWrite(tripId, [Role.MONITOR])

  const item = await findItineraryItem(tripId, itemId)

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')
  if (!(file instanceof File)) throw new ApiError('VALIDATION_ERROR', 'Falta la foto.')
  if (!file.type.startsWith('image/')) throw new ApiError('VALIDATION_ERROR', 'Solo se permiten imágenes.')
  if (file.size > MAX_FILE_SIZE) throw new ApiError('VALIDATION_ERROR', 'La foto debe pesar 8 MB o menos.')

  if (item.photoUrl) {
    await del(item.photoUrl).catch(() => {})
  }

  const extension = file.name.split('.').pop() || 'jpg'
  const blob = await put(`itinerary/${itemId}-${Date.now()}.${extension}`, file, { access: 'public' })

  const updated = await prisma.itineraryItem.update({
    where: { id: itemId },
    data: { photoUrl: blob.url },
  })

  // The group's status follows the activity's status (see ../route.ts), not photos: a photo added
  // to an activity that's already over must not put the group back "En actividad".
  return NextResponse.json({ item: updated }, { status: 201 })
})

export const DELETE = withApiHandler<{ tripId: string; itemId: string }>(async (_request, { params }) => {
  const { tripId, itemId } = await params
  await requireTripWrite(tripId, [Role.MONITOR])

  const item = await findItineraryItem(tripId, itemId)
  if (item.photoUrl) {
    await del(item.photoUrl).catch(() => {})
  }

  const updated = await prisma.itineraryItem.update({
    where: { id: itemId },
    data: { photoUrl: null },
  })

  return NextResponse.json({ item: updated })
})
