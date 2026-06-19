import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'

export async function GET(request: Request) {
  try {
    await requireAdmin()

    const query = new URL(request.url).searchParams.get('q')?.trim() ?? ''
    if (!query) return NextResponse.json({ trips: [], codes: [] })

    const [trips, codes] = await Promise.all([
      prisma.trip.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { destination: { contains: query, mode: 'insensitive' } },
            { school: { name: { contains: query, mode: 'insensitive' } } },
          ],
        },
        include: { school: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      prisma.accessCode.findMany({
        where: { code: { contains: query, mode: 'insensitive' } },
        include: { trip: { select: { id: true, name: true } } },
        take: 8,
      }),
    ])

    return NextResponse.json({ trips, codes })
  } catch (error) {
    return handleApiError(error)
  }
}
