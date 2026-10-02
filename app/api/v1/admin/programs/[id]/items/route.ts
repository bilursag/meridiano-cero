import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'
import { dayReorderSchema } from '@/lib/api/itinerary'

const bodySchema = z.object({
  dayNumber: z.number().int().min(1),
  time: z.string().trim().min(1),
  title: z.string().trim().min(1),
  location: z.string().trim().min(1),
  description: z.string().trim().min(1),
  order: z.number().int().nonnegative().optional(),
  requirementsMessage: z.string().trim().min(1).nullable().optional(),
})

export const POST = withApiHandler<{ id: string }>(async (request, { params }) => {
  await requireAdmin()
  const { id: programId } = await params

  const program = await prisma.program.findUnique({ where: { id: programId } })
  if (!program) throw new ApiError('NOT_FOUND', 'No se encontró el programa.')

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Faltan datos de la actividad o no son válidos.')

  let order = parsed.data.order
  if (order === undefined) {
    const last = await prisma.programItem.findFirst({ where: { programId }, orderBy: { order: 'desc' } })
    order = (last?.order ?? -1) + 1
  }

  const item = await prisma.programItem.create({
    data: { ...parsed.data, order, programId },
  })

  return NextResponse.json({ item }, { status: 201 })
})

// Saves a drag-and-drop move (possibly across days) atomically. Programs have no fixed length, so any
// day number is accepted.
export const PATCH = withApiHandler<{ id: string }>(async (request, { params }) => {
  await requireAdmin()
  const { id: programId } = await params

  const json = await request.json().catch(() => null)
  const parsed = dayReorderSchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'El nuevo orden de las actividades no es válido.')
  const changes = parsed.data.items

  const ids = changes.map((change) => change.id)
  const owned = await prisma.programItem.count({ where: { id: { in: ids }, programId } })
  if (owned !== new Set(ids).size) throw new ApiError('NOT_FOUND', 'No se encontró la actividad del programa.')

  await prisma.$transaction(
    changes.map(({ id, dayNumber, order, time }) =>
      prisma.programItem.update({ where: { id }, data: { dayNumber, order, time } })
    )
  )

  const items = await prisma.programItem.findMany({
    where: { programId },
    orderBy: [{ dayNumber: 'asc' }, { order: 'asc' }],
  })
  return NextResponse.json({ items })
})
