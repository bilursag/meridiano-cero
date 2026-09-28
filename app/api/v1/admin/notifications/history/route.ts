import { NextResponse } from 'next/server'
import { z } from 'zod'
import { NotificationType } from '@prisma/client'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'
import { listAdminNotifications } from '@/lib/notifications'

const querySchema = z.object({
  type: z.enum(NotificationType).optional(),
  cursor: z.string().min(1).optional(),
})

export const GET = withApiHandler(async (request) => {
  const { clerkUserId } = await requireAdmin()

  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse({
    type: searchParams.get('type') ?? undefined,
    cursor: searchParams.get('cursor') ?? undefined,
  })
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Invalid notification filter.')

  return NextResponse.json(await listAdminNotifications(clerkUserId, parsed.data))
})
