import { NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireTripWrite } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

export const DELETE = withApiHandler<{ tripId: string; announcementId: string }>(
  async (_request, { params }) => {
    const { tripId, announcementId } = await params
    await requireTripWrite(tripId, [Role.MONITOR])

    const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } })
    if (!announcement || announcement.tripId !== tripId) {
      throw new ApiError('NOT_FOUND', 'No se encontró el comunicado.')
    }

    if (announcement.photoUrl) {
      await del(announcement.photoUrl).catch(() => {})
    }

    await prisma.announcement.delete({ where: { id: announcementId } })

    return NextResponse.json({ ok: true })
  }
)
