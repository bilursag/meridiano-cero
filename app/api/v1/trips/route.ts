import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError, handleApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'

export async function GET() {
  try {
    await requireAdmin()

    const trips = await prisma.trip.findMany({
      include: { school: { select: { name: true } }, accessCodes: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ trips })
  } catch (error) {
    return handleApiError(error)
  }
}

const bodySchema = z.object({
  name: z.string().trim().min(1),
  schoolName: z.string().trim().min(1),
  destination: z.string().trim().min(1),
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime(),
  totalDays: z.number().int().positive(),
  studentCount: z.number().int().nonnegative(),
  initialLat: z.number(),
  initialLng: z.number(),
  parentCode: z.string().trim().min(1),
  monitorCode: z.string().trim().min(1),
})

export async function POST(request: Request) {
  try {
    await requireAdmin()

    const json = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Missing or invalid trip fields.')

    const { schoolName, parentCode, monitorCode, ...tripData } = parsed.data

    const school =
      (await prisma.school.findFirst({ where: { name: schoolName } })) ??
      (await prisma.school.create({ data: { name: schoolName } }))

    const trip = await prisma.trip.create({
      data: {
        ...tripData,
        startDate: new Date(tripData.startDate),
        endDate: new Date(tripData.endDate),
        schoolId: school.id,
        accessCodes: {
          create: [
            { code: parentCode.toUpperCase(), role: Role.PARENT },
            { code: monitorCode.toUpperCase(), role: Role.MONITOR },
          ],
        },
      },
    })

    return NextResponse.json({ trip }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
