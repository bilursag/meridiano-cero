import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'
import { generateAccessCode } from '@/lib/generate-code'

export const GET = withApiHandler(async (request) => {
  await requireAdmin()

  const tripId = new URL(request.url).searchParams.get('tripId')

  const codes = await prisma.accessCode.findMany({
    where: tripId ? { tripId } : undefined,
    include: { trip: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ codes })
})

const bodySchema = z.object({
  tripId: z.string().min(1),
  role: z.enum(Role),
})

export const POST = withApiHandler(async (request) => {
  await requireAdmin()

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Faltan el grupo o el rol.')

  const trip = await prisma.trip.findUnique({ where: { id: parsed.data.tripId } })
  if (!trip) throw new ApiError('NOT_FOUND', 'No se encontró el grupo.')

  let code = generateAccessCode()
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await prisma.accessCode.findUnique({ where: { code } })
    if (!existing) break
    code = generateAccessCode()
  }

  const accessCode = await prisma.accessCode.create({
    data: { code, role: parsed.data.role, tripId: parsed.data.tripId },
    include: { trip: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ code: accessCode }, { status: 201 })
})
