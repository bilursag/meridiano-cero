import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler } from '@/lib/api/handler'
import { requireTrackingToken } from '@/lib/api/tracking-token'

/**
 * Revokes the tracking token it is called with: the coordinator paused tracking, switched trips or
 * signed out. Takes the token itself rather than a Clerk session, so it works after sign-out too.
 */
export const DELETE = withApiHandler(async (request) => {
  const token = await requireTrackingToken(request)
  await prisma.trackingToken.update({ where: { id: token.id }, data: { revokedAt: new Date() } })
  return new NextResponse(null, { status: 204 })
})
