import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'

export async function GET() {
  try {
    await requireAdmin()

    const trips = await prisma.trip.findMany({
      where: { status: { not: 'FINISHED' } },
      include: {
        school: { select: { name: true } },
        locationPings: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    })

    const fleet = trips.map((trip) => ({
      id: trip.id,
      name: trip.name,
      destination: trip.destination,
      status: trip.status,
      school: trip.school.name,
      ping: trip.locationPings[0] ?? null,
      initialLat: trip.initialLat,
      initialLng: trip.initialLng,
    }))

    return NextResponse.json({ fleet })
  } catch (error) {
    return handleApiError(error)
  }
}
