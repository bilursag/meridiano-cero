import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ItineraryStatus, Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError, handleApiError } from '@/lib/api/errors'
import { requireTripRole } from '@/lib/api/require-role'

const bodySchema = z.object({ status: z.enum(ItineraryStatus) })

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tripId: string; itemId: string }> }
) {
  try {
    const { tripId, itemId } = await params
    await requireTripRole(tripId, [Role.MONITOR])

    const json = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'A valid status is required.')

    const item = await prisma.itineraryItem.findUnique({ where: { id: itemId } })
    if (!item || item.tripId !== tripId) throw new ApiError('NOT_FOUND', 'Itinerary item not found.')

    const updated = await prisma.itineraryItem.update({
      where: { id: itemId },
      data: { status: parsed.data.status },
    })

    return NextResponse.json({ item: updated })
  } catch (error) {
    return handleApiError(error)
  }
}
