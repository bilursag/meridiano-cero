import { createHash, randomBytes } from 'node:crypto'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

/** Issues a new tracking token for the coordinator on this trip and revokes their earlier ones. */
export async function issueTrackingToken(tripId: string, clerkUserId: string) {
  const token = randomBytes(32).toString('base64url')
  const now = new Date()
  await prisma.$transaction([
    prisma.trackingToken.updateMany({
      where: { tripId, clerkUserId, revokedAt: null },
      data: { revokedAt: now },
    }),
    prisma.trackingToken.create({ data: { tripId, clerkUserId, tokenHash: hashToken(token) } }),
  ])
  return token
}

function bearerToken(request: Request) {
  const match = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)
  return match?.[1] ?? null
}

/** The live tracking token sent as `Authorization: Bearer <token>`, with its trip. */
export async function requireTrackingToken(request: Request) {
  const token = bearerToken(request)
  const record = token
    ? await prisma.trackingToken.findUnique({
        where: { tokenHash: hashToken(token) },
        include: { trip: { select: { id: true, status: true, endDate: true } } },
      })
    : null
  if (!record || record.revokedAt) {
    throw new ApiError('UNAUTHENTICATED', 'La transmisión de ubicación se detuvo. Ábrela de nuevo desde la app.')
  }
  return record
}

/** Revokes every live token of this coordinator on this trip (tracking paused from the app). */
export async function revokeTrackingTokens(tripId: string, clerkUserId: string) {
  await prisma.trackingToken.updateMany({
    where: { tripId, clerkUserId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}
