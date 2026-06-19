import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'

export async function GET() {
  try {
    await requireAdmin()

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [
      tripsByStatus,
      announcementsByType,
      tripCount,
      schoolCount,
      codesIssued,
      codesRedeemed,
      recentAnnouncements,
    ] = await Promise.all([
      prisma.trip.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.announcement.groupBy({
        by: ['type'],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { _all: true },
      }),
      prisma.trip.count(),
      prisma.school.count(),
      prisma.accessCode.count(),
      prisma.tripMembership.count(),
      prisma.announcement.findMany({
        where: { createdAt: { gte: fourteenDaysAgo } },
        select: { createdAt: true },
      }),
    ])

    const dailyAnnouncements = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(fourteenDaysAgo)
      date.setDate(date.getDate() + index)
      const key = date.toISOString().slice(0, 10)
      const count = recentAnnouncements.filter(
        (a) => a.createdAt.toISOString().slice(0, 10) === key
      ).length
      return { date: key, count }
    })

    return NextResponse.json({
      tripsByStatus: tripsByStatus.map((row) => ({ status: row.status, count: row._count._all })),
      announcementsByType: announcementsByType.map((row) => ({
        type: row.type,
        count: row._count._all,
      })),
      tripCount,
      schoolCount,
      codesIssued,
      codesRedeemed,
      dailyAnnouncements,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
