import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AnnouncementType } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

const bodySchema = z.object({
  title: z.string().trim().min(1).optional(),
  message: z.string().trim().min(1).optional(),
  type: z.enum(AnnouncementType).optional(),
  category: z.string().trim().min(1).nullable().optional(),
})

export const PATCH = withApiHandler<{ id: string }>(async (request, { params }) => {
  await requireAdmin()
  const { id } = await params

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Los cambios del mensaje no son válidos.')
  if (Object.keys(parsed.data).length === 0) throw new ApiError('VALIDATION_ERROR', 'No hay cambios para guardar.')

  const existing = await prisma.announcementTemplate.findUnique({ where: { id } })
  if (!existing) throw new ApiError('NOT_FOUND', 'No se encontró el mensaje.')

  const template = await prisma.announcementTemplate.update({ where: { id }, data: parsed.data })

  return NextResponse.json({ template })
})

export const DELETE = withApiHandler<{ id: string }>(async (_request, { params }) => {
  await requireAdmin()
  const { id } = await params

  const existing = await prisma.announcementTemplate.findUnique({ where: { id } })
  if (!existing) throw new ApiError('NOT_FOUND', 'No se encontró el mensaje.')

  await prisma.announcementTemplate.delete({ where: { id } })

  return NextResponse.json({ ok: true })
})
