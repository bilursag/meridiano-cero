import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AnnouncementType } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin, requireAuthenticated } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

export const GET = withApiHandler(async () => {
  await requireAuthenticated()

  const templates = await prisma.announcementTemplate.findMany({
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
  })

  return NextResponse.json({ templates })
})

const bodySchema = z.object({
  title: z.string().trim().min(1),
  message: z.string().trim().min(1),
  type: z.enum(AnnouncementType).optional(),
  category: z.string().trim().min(1).optional(),
})

export const POST = withApiHandler(async (request) => {
  await requireAdmin()

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Faltan el título o el mensaje.')

  const template = await prisma.announcementTemplate.create({ data: parsed.data })

  return NextResponse.json({ template }, { status: 201 })
})
