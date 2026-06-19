import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api/errors'
import { requireTripAccess } from '@/lib/api/require-role'

export async function GET(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { tripId } = await params
    await requireTripAccess(tripId)

    const items = await prisma.itineraryItem.findMany({
      where: { tripId },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ items })
  } catch (error) {
    return handleApiError(error)
  }
}
