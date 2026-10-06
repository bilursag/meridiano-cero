import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

export const GET = withApiHandler(async () => {
  await requireAdmin()

  const [programs, lastDays] = await Promise.all([
    prisma.program.findMany({
      include: { _count: { select: { items: true, trips: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.programItem.groupBy({ by: ['programId'], _max: { dayNumber: true } }),
  ])
  const dayCountByProgram = new Map(lastDays.map((row) => [row.programId, row._max.dayNumber ?? 0]))

  const result = programs.map((program) => ({
    id: program.id,
    name: program.name,
    description: program.description,
    itemCount: program._count.items,
    tripCount: program._count.trips,
    // The last day with activities: how many days a trip needs for the whole program to fit.
    dayCount: dayCountByProgram.get(program.id) ?? 0,
    createdAt: program.createdAt,
  }))

  return NextResponse.json({ programs: result })
})

const bodySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
})

export const POST = withApiHandler(async (request) => {
  await requireAdmin()

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Ingresa un nombre para el programa.')

  const program = await prisma.program.create({ data: parsed.data })

  return NextResponse.json({ program }, { status: 201 })
})
