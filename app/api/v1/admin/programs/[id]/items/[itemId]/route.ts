import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

async function findProgramItem(programId: string, itemId: string) {
  const item = await prisma.programItem.findUnique({ where: { id: itemId } })
  if (!item || item.programId !== programId) throw new ApiError('NOT_FOUND', 'No se encontró la actividad del programa.')
  return item
}

const bodySchema = z.object({
  dayNumber: z.number().int().min(1).optional(),
  time: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).optional(),
  location: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  order: z.number().int().nonnegative().optional(),
  requirementsMessage: z.string().trim().min(1).nullable().optional(),
})

export const PATCH = withApiHandler<{ id: string; itemId: string }>(async (request, { params }) => {
  await requireAdmin()
  const { id: programId, itemId } = await params

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Los cambios de la actividad no son válidos.')
  if (Object.keys(parsed.data).length === 0) throw new ApiError('VALIDATION_ERROR', 'No hay cambios para guardar.')

  await findProgramItem(programId, itemId)

  const item = await prisma.programItem.update({ where: { id: itemId }, data: parsed.data })

  return NextResponse.json({ item })
})

export const DELETE = withApiHandler<{ id: string; itemId: string }>(async (_request, { params }) => {
  await requireAdmin()
  const { id: programId, itemId } = await params

  await findProgramItem(programId, itemId)
  await prisma.programItem.delete({ where: { id: itemId } })

  return NextResponse.json({ ok: true })
})
