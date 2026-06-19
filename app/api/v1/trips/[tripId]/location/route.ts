import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError, handleApiError } from '@/lib/api/errors'
import { requireTripAccess, requireTripRole } from '@/lib/api/require-role'

const MIN_PING_INTERVAL_MS = 5000

const bodySchema = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number().int().nonnegative(),
})

export async function GET(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params
    await requireTripAccess(tripId)

    const ping = await prisma.locationPing.findFirst({
      where: { tripId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ ping })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params
    await requireTripRole(tripId, [Role.MONITOR])

    const json = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'lat, lng and accuracy are required.')

    const lastPing = await prisma.locationPing.findFirst({
      where: { tripId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })
    if (lastPing && Date.now() - lastPing.createdAt.getTime() < MIN_PING_INTERVAL_MS) {
      throw new ApiError('RATE_LIMITED', 'Location pings are limited to one every 5 seconds.')
    }

    const ping = await prisma.locationPing.create({
      data: { tripId, ...parsed.data },
    })

    return NextResponse.json({ ping }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
