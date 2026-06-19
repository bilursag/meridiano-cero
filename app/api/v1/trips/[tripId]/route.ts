import { NextResponse } from 'next/server'
import { z } from 'zod'
import { TripStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError, handleApiError } from '@/lib/api/errors'
import { requireTripAccess } from '@/lib/api/require-role'

export async function GET(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params
    await requireTripAccess(tripId)

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { school: { select: { name: true } } },
    })
    if (!trip) throw new ApiError('NOT_FOUND', 'Trip not found.')

    return NextResponse.json({ trip })
  } catch (error) {
    return handleApiError(error)
  }
}

const patchSchema = z.object({ status: z.enum(TripStatus) })

export async function PATCH(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params
    const { role } = await requireTripAccess(tripId)
    if (role !== 'ADMIN' && role !== 'MONITOR') {
      throw new ApiError('FORBIDDEN', 'Only monitors or admins can update trip status.')
    }

    const json = await request.json().catch(() => null)
    const parsed = patchSchema.safeParse(json)
    if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'A valid status is required.')

    const trip = await prisma.trip.update({
      where: { id: tripId },
      data: { status: parsed.data.status },
    })

    return NextResponse.json({ trip })
  } catch (error) {
    return handleApiError(error)
  }
}
