import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'

export async function GET() {
  try {
    await requireAdmin()

    const announcements = await prisma.announcement.findMany({
      where: { type: { in: ['ALERT', 'ACHIEVEMENT'] } },
      include: { trip: { select: { id: true, name: true, school: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ announcements })
  } catch (error) {
    return handleApiError(error)
  }
}
