import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'
import { createTrip } from '@/lib/api/trips'
import { describeUsers } from '@/lib/api/clerk-users'

export const GET = withApiHandler(async () => {
  await requireAdmin()

  const trips = await prisma.trip.findMany({
    include: {
      school: { select: { name: true } },
      program: { select: { name: true } },
      accessCodes: true,
      memberships: { where: { role: Role.MONITOR }, select: { clerkUserId: true } },
      itineraryItems: {
        select: { dayNumber: true, title: true, status: true },
        orderBy: [{ dayNumber: 'asc' }, { order: 'asc' }],
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const monitorIds = trips.flatMap((trip) => trip.memberships.map((m) => m.clerkUserId))
  const users = await describeUsers(monitorIds)

  const result = trips.map(({ memberships, ...trip }) => ({
    ...trip,
    monitorNames: memberships.map((m) => users.get(m.clerkUserId)?.name).filter((n): n is string => !!n),
  }))

  return NextResponse.json({ trips: result })
})

const bodySchema = z
  .object({
    name: z.string().trim().min(1),
    groupNumber: z.string().trim().min(1).optional(),
    grade: z.string().trim().min(1).optional(),
    salesExecutive: z.string().trim().min(1).optional(),
    school: z.string().trim().min(1),
    destination: z.string().trim().min(1),
    startDate: z.iso.datetime(),
    endDate: z.iso.datetime(),
    studentCount: z.number().int().nonnegative(),
    studentCountMale: z.number().int().nonnegative().optional(),
    studentCountFemale: z.number().int().nonnegative().optional(),
    companionCountMale: z.number().int().nonnegative().optional(),
    companionCountFemale: z.number().int().nonnegative().optional(),
    initialLat: z.number().min(-90).max(90),
    initialLng: z.number().min(-180).max(180),
    parentCode: z.string().trim().min(1),
    monitorCode: z.string().trim().min(1),
    studentCode: z.string().trim().min(1),
    programId: z.string().trim().min(1),
    hotel: z.string().trim().min(1).optional(),
    legs: z
      .array(
        z.object({
          label: z.string().trim().min(1),
          lat: z.number().min(-90).max(90),
          lng: z.number().min(-180).max(180),
        })
      )
      .optional(),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'endDate must be on or after startDate.',
    path: ['endDate'],
  })

export const POST = withApiHandler(async (request) => {
  await requireAdmin()

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Missing or invalid trip fields.')

  const trip = await createTrip({
    ...parsed.data,
    startDate: new Date(parsed.data.startDate),
    endDate: new Date(parsed.data.endDate),
  })

  return NextResponse.json({ trip }, { status: 201 })
})
