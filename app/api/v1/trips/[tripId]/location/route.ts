import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireTripAccess, requireTripWrite } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

const MIN_PING_INTERVAL_MS = 5000

const bodySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().int().nonnegative(),
})

export const GET = withApiHandler<{ tripId: string }>(async (_request, { params }) => {
  const { tripId } = await params
  await requireTripAccess(tripId)

  const ping = await prisma.locationPing.findFirst({
    where: { tripId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ ping })
})

export const POST = withApiHandler<{ tripId: string }>(async (request, { params }) => {
  const { tripId } = await params
  await requireTripWrite(tripId, [Role.MONITOR])

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Faltan la latitud, la longitud o la precisión.')

  const lastPing = await prisma.locationPing.findFirst({
    where: { tripId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })
  if (lastPing && Date.now() - lastPing.createdAt.getTime() < MIN_PING_INTERVAL_MS) {
    throw new ApiError('RATE_LIMITED', 'La ubicación se puede enviar como máximo cada 5 segundos.')
  }

  const ping = await prisma.locationPing.create({
    data: { tripId, ...parsed.data },
  })

  return NextResponse.json({ ping }, { status: 201 })
})
