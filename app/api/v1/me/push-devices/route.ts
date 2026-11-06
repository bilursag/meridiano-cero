import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAuthenticated } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

const tokenSchema = z.string().regex(/^(Exponent|Expo)PushToken\[[^\]]+\]$/)
const registerSchema = z.object({ token: tokenSchema, platform: z.enum(['ios', 'android']) })
const removeSchema = z.object({ token: tokenSchema })

/**
 * The app registers its push token after sign-in. A phone has one token: if another account signed
 * in on it before, the token now belongs to this one, so notifications follow whoever is signed in.
 */
export const POST = withApiHandler(async (request) => {
  const { clerkUserId } = await requireAuthenticated()
  const parsed = registerSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'El identificador de notificaciones no es válido.')

  const { token, platform } = parsed.data
  await prisma.pushDevice.upsert({
    where: { token },
    create: { token, platform, clerkUserId },
    update: { platform, clerkUserId },
  })
  return NextResponse.json({ ok: true }, { status: 201 })
})

/** Signing out (or deleting the account) stops this phone's notifications for that account. */
export const DELETE = withApiHandler(async (request) => {
  const { clerkUserId } = await requireAuthenticated()
  const parsed = removeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'El identificador de notificaciones no es válido.')

  await prisma.pushDevice.deleteMany({ where: { token: parsed.data.token, clerkUserId } })
  return NextResponse.json({ ok: true })
})
