import { NextResponse } from 'next/server'
import { put, del } from '@vercel/blob'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError, handleApiError } from '@/lib/api/errors'
import { requireTripRole } from '@/lib/api/require-role'

const MAX_FILE_SIZE = 8 * 1024 * 1024

async function findItem(tripId: string, itemId: string) {
  const item = await prisma.itineraryItem.findUnique({ where: { id: itemId } })
  if (!item || item.tripId !== tripId) throw new ApiError('NOT_FOUND', 'Itinerary item not found.')
  return item
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string; itemId: string }> }
) {
  try {
    const { tripId, itemId } = await params
    await requireTripRole(tripId, [Role.MONITOR])

    const item = await findItem(tripId, itemId)

    const formData = await request.formData().catch(() => null)
    const file = formData?.get('file')
    if (!(file instanceof File)) throw new ApiError('VALIDATION_ERROR', 'A photo file is required.')
    if (!file.type.startsWith('image/')) throw new ApiError('VALIDATION_ERROR', 'Only image files are allowed.')
    if (file.size > MAX_FILE_SIZE) throw new ApiError('VALIDATION_ERROR', 'The photo must be 8MB or smaller.')

    if (item.photoUrl) {
      await del(item.photoUrl).catch(() => {})
    }

    const extension = file.name.split('.').pop() || 'jpg'
    const blob = await put(`itinerary/${itemId}-${Date.now()}.${extension}`, file, { access: 'public' })

    const updated = await prisma.itineraryItem.update({
      where: { id: itemId },
      data: { photoUrl: blob.url },
    })

    return NextResponse.json({ item: updated }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ tripId: string; itemId: string }> }
) {
  try {
    const { tripId, itemId } = await params
    await requireTripRole(tripId, [Role.MONITOR])

    const item = await findItem(tripId, itemId)
    if (item.photoUrl) {
      await del(item.photoUrl).catch(() => {})
    }

    const updated = await prisma.itineraryItem.update({
      where: { id: itemId },
      data: { photoUrl: null },
    })

    return NextResponse.json({ item: updated })
  } catch (error) {
    return handleApiError(error)
  }
}
