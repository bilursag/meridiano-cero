import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'
import { applyProgramToTrip } from '@/lib/api/programs'

const bodySchema = z.object({ tripId: z.string().trim().min(1) })

export const POST = withApiHandler<{ id: string }>(async (request, { params }) => {
  await requireAdmin()
  const { id: programId } = await params

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Falta el grupo.')

  const trip = await prisma.trip.findUnique({ where: { id: parsed.data.tripId } })
  if (!trip) throw new ApiError('NOT_FOUND', 'No se encontró el grupo.')

  const items = await applyProgramToTrip(parsed.data.tripId, programId)

  return NextResponse.json({ items }, { status: 201 })
})
