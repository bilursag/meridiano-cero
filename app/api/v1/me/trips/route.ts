import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { withApiHandler } from '@/lib/api/handler'

export const GET = withApiHandler(async () => {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) throw new ApiError('UNAUTHENTICATED', 'Debes iniciar sesión.')

  const admin = await prisma.adminUser.findUnique({ where: { clerkUserId } })
  if (admin) {
    return NextResponse.json({ isAdmin: true, memberships: [] })
  }

  const memberships = await prisma.tripMembership.findMany({
    where: { clerkUserId },
    select: { tripId: true, role: true, trip: { select: { name: true } } },
  })

  return NextResponse.json({ isAdmin: false, memberships })
})
