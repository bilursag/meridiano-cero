import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'
import { describeUsers } from '@/lib/api/clerk-users'

// Kept in sync with MAX_RANGE_DAYS in app/admin/schedule/page.tsx — the grid
// itself is the real constraint, no point letting the API accept more than
// the UI can usefully render.
const MAX_RANGE_DAYS = 62
const DEFAULT_RANGE_DAYS = 21

function parseRange(fromParam: string | null, toParam: string | null): { start: Date; end: Date } {
  const now = new Date()
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const defaultEnd = new Date(defaultStart)
  defaultEnd.setDate(defaultEnd.getDate() + DEFAULT_RANGE_DAYS)

  const start = fromParam && !Number.isNaN(Date.parse(fromParam)) ? new Date(fromParam) : defaultStart
  const end = toParam && !Number.isNaN(Date.parse(toParam)) ? new Date(toParam) : defaultEnd

  if (end < start) throw new ApiError('VALIDATION_ERROR', 'La fecha final debe ser igual o posterior a la inicial.')

  const rangeDays = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
  if (rangeDays > MAX_RANGE_DAYS) {
    throw new ApiError('VALIDATION_ERROR', `El rango es demasiado largo: máximo ${MAX_RANGE_DAYS} días.`)
  }

  return { start, end }
}

export const GET = withApiHandler(async (request) => {
  await requireAdmin()

  const { searchParams } = new URL(request.url)
  const { start, end } = parseRange(searchParams.get('from'), searchParams.get('to'))

  const trips = await prisma.trip.findMany({
    where: { startDate: { lte: end }, endDate: { gte: start } },
    include: {
      school: { select: { name: true } },
      program: { select: { name: true } },
      itineraryItems: { select: { dayNumber: true, title: true, time: true }, orderBy: { dayNumber: 'asc' } },
      memberships: { where: { role: Role.MONITOR }, select: { clerkUserId: true } },
    },
    orderBy: { startDate: 'asc' },
  })

  const monitorIds = trips.flatMap((trip) => trip.memberships.map((m) => m.clerkUserId))
  const users = await describeUsers(monitorIds)
  const result = trips.map(({ memberships, ...trip }) => ({
    ...trip,
    monitorNames: memberships.map((m) => users.get(m.clerkUserId)?.name).filter((n): n is string => !!n),
  }))

  return NextResponse.json({ range: { start, end }, trips: result })
})
