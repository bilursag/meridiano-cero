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

const patchSchema = z.object({
  status: z.enum(TripStatus).optional(),
  name: z.string().trim().min(1).optional(),
  destination: z.string().trim().min(1).optional(),
  startDate: z.iso.datetime().optional(),
  endDate: z.iso.datetime().optional(),
  totalDays: z.number().int().positive().optional(),
  studentCount: z.number().int().nonnegative().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params
    const { role } = await requireTripAccess(tripId)

    const json = await request.json().catch(() => null)
    const parsed = patchSchema.safeParse(json)
    if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Invalid trip update payload.')

    const { status, startDate, endDate, ...detailFields } = parsed.data
    const hasDetailFields = startDate !== undefined || endDate !== undefined || Object.keys(detailFields).length > 0

    if (hasDetailFields && role !== 'ADMIN') {
      throw new ApiError('FORBIDDEN', 'Only admins can edit trip details.')
    }
    if (status !== undefined && role !== 'ADMIN' && role !== 'MONITOR') {
      throw new ApiError('FORBIDDEN', 'Only monitors or admins can update trip status.')
    }
    if (!hasDetailFields && status === undefined) {
      throw new ApiError('VALIDATION_ERROR', 'Nothing to update.')
    }

    const trip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...detailFields,
        ...(startDate !== undefined ? { startDate: new Date(startDate) } : {}),
        ...(endDate !== undefined ? { endDate: new Date(endDate) } : {}),
      },
    })

    return NextResponse.json({ trip })
  } catch (error) {
    return handleApiError(error)
  }
}
