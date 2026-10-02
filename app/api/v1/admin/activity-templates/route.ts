import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

export const GET = withApiHandler(async () => {
  await requireAdmin()

  const activityTemplates = await prisma.activityTemplate.findMany({
    orderBy: { title: 'asc' },
  })

  return NextResponse.json({ activityTemplates })
})

const bodySchema = z.object({
  title: z.string().trim().min(1),
  destination: z.string().trim().min(1).optional(),
  defaultLocation: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1),
  requirementsMessage: z.string().trim().min(1).optional(),
})

export const POST = withApiHandler(async (request) => {
  await requireAdmin()

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Faltan el título o la descripción.')

  const activityTemplate = await prisma.activityTemplate.create({ data: parsed.data })

  return NextResponse.json({ activityTemplate }, { status: 201 })
})
