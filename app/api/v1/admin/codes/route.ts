import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError, handleApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(length = 6) {
  return Array.from({ length }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')
}

export async function GET(request: Request) {
  try {
    await requireAdmin()

    const tripId = new URL(request.url).searchParams.get('tripId')

    const codes = await prisma.accessCode.findMany({
      where: tripId ? { tripId } : undefined,
      include: { trip: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ codes })
  } catch (error) {
    return handleApiError(error)
  }
}

const bodySchema = z.object({
  tripId: z.string().min(1),
  role: z.enum(Role),
})

export async function POST(request: Request) {
  try {
    await requireAdmin()

    const json = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'tripId and role are required.')

    const trip = await prisma.trip.findUnique({ where: { id: parsed.data.tripId } })
    if (!trip) throw new ApiError('NOT_FOUND', 'Trip not found.')

    let code = generateCode()
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await prisma.accessCode.findUnique({ where: { code } })
      if (!existing) break
      code = generateCode()
    }

    const accessCode = await prisma.accessCode.create({
      data: { code, role: parsed.data.role, tripId: parsed.data.tripId },
      include: { trip: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ code: accessCode }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
