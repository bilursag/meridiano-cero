import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AnnouncementType, Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError, handleApiError } from '@/lib/api/errors'
import { requireTripAccess, requireTripRole } from '@/lib/api/require-role'

const bodySchema = z.object({
  title: z.string().trim().min(1),
  message: z.string().trim().min(1),
  authorName: z.string().trim().min(1),
  type: z.enum(AnnouncementType).optional(),
})

export async function GET(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params
    await requireTripAccess(tripId)

    const announcements = await prisma.announcement.findMany({
      where: { tripId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ announcements })
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
    if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Title, message and authorName are required.')

    const announcement = await prisma.announcement.create({
      data: { tripId, ...parsed.data },
    })

    return NextResponse.json({ announcement }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
