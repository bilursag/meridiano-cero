import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

export const GET = withApiHandler(async () => {
  await requireAdmin()

  const programs = await prisma.program.findMany({
    include: { _count: { select: { items: true, trips: true } } },
    orderBy: { name: 'asc' },
  })

  const result = programs.map((program) => ({
    id: program.id,
    name: program.name,
    description: program.description,
    itemCount: program._count.items,
    tripCount: program._count.trips,
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
