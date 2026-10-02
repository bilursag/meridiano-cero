import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

const bodySchema = z.object({
  title: z.string().trim().min(1).optional(),
  destination: z.string().trim().min(1).nullable().optional(),
  defaultLocation: z.string().trim().min(1).nullable().optional(),
  description: z.string().trim().min(1).optional(),
  requirementsMessage: z.string().trim().min(1).nullable().optional(),
})

export const PATCH = withApiHandler<{ id: string }>(async (request, { params }) => {
  await requireAdmin()
  const { id } = await params

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Los cambios de la actividad no son válidos.')
  if (Object.keys(parsed.data).length === 0) throw new ApiError('VALIDATION_ERROR', 'No hay cambios para guardar.')

  const existing = await prisma.activityTemplate.findUnique({ where: { id } })
  if (!existing) throw new ApiError('NOT_FOUND', 'No se encontró la actividad.')

  const activityTemplate = await prisma.activityTemplate.update({ where: { id }, data: parsed.data })

  return NextResponse.json({ activityTemplate })
})

export const DELETE = withApiHandler<{ id: string }>(async (_request, { params }) => {
  await requireAdmin()
  const { id } = await params

  const existing = await prisma.activityTemplate.findUnique({ where: { id } })
  if (!existing) throw new ApiError('NOT_FOUND', 'No se encontró la actividad.')

  await prisma.activityTemplate.delete({ where: { id } })

  return NextResponse.json({ ok: true })
})
