import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { withApiHandler } from '@/lib/api/handler'
import { notifyInBackground, notifyMonitorJoined } from '@/lib/notifications'

const bodySchema = z.object({ code: z.string().trim().min(1) })

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const RATE_LIMIT_MAX_ATTEMPTS = 10

export const POST = withApiHandler(async (request) => {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) throw new ApiError('UNAUTHENTICATED', 'You must be signed in.')

  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS)
  const recentAttempts = await prisma.redeemAttempt.count({
    where: { clerkUserId, createdAt: { gte: windowStart } },
  })
  if (recentAttempts >= RATE_LIMIT_MAX_ATTEMPTS) {
    throw new ApiError('RATE_LIMITED', 'Too many code attempts. Try again later.')
  }
  await prisma.redeemAttempt.create({ data: { clerkUserId } })

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'A trip code is required.')
  }

  const code = parsed.data.code.toUpperCase()

  const accessCode = await prisma.accessCode.findUnique({ where: { code } })
  if (!accessCode) {
    throw new ApiError('NOT_FOUND', 'Invalid access code.')
  }

  // createMany + skipDuplicates instead of upsert so we know whether this is a new membership.
  const { count: created } = await prisma.tripMembership.createMany({
    data: { clerkUserId, tripId: accessCode.tripId, role: accessCode.role },
    skipDuplicates: true,
  })

  if (created > 0 && accessCode.role === Role.MONITOR) {
    notifyInBackground(() => notifyMonitorJoined(accessCode.tripId, clerkUserId))
  }

  return NextResponse.json({ role: accessCode.role, tripId: accessCode.tripId })
})
