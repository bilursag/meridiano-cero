import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { ApiError, handleApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'

export async function GET() {
  try {
    await requireAdmin()

    const schools = await prisma.school.findMany({
      include: {
        trips: { select: { studentCount: true, status: true } },
        _count: { select: { trips: true } },
      },
      orderBy: { name: 'asc' },
    })

    const result = schools.map((school) => ({
      id: school.id,
      name: school.name,
      tripCount: school._count.trips,
      activeTripCount: school.trips.filter((trip) => trip.status !== 'FINISHED').length,
      studentCount: school.trips.reduce((sum, trip) => sum + trip.studentCount, 0),
    }))

    return NextResponse.json({ schools: result })
  } catch (error) {
    return handleApiError(error)
  }
}

const bodySchema = z.object({ name: z.string().trim().min(1) })

export async function POST(request: Request) {
  try {
    await requireAdmin()

    const json = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'A school name is required.')

    const existing = await prisma.school.findFirst({ where: { name: parsed.data.name } })
    if (existing) throw new ApiError('VALIDATION_ERROR', 'A school with that name already exists.')

    const school = await prisma.school.create({ data: { name: parsed.data.name } })

    return NextResponse.json({ school }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
