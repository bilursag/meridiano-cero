import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { ApiError, handleApiError } from '@/lib/api/errors'

const bodySchema = z.object({ code: z.string().trim().min(1) })

export async function POST(request: Request) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) throw new ApiError('UNAUTHENTICATED', 'You must be signed in.')

    const json = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', 'A trip code is required.')
    }

    const code = parsed.data.code.toUpperCase()

    if (process.env.ADMIN_INVITE_CODE && code === process.env.ADMIN_INVITE_CODE.toUpperCase()) {
      await prisma.adminUser.upsert({
        where: { clerkUserId },
        update: {},
        create: { clerkUserId },
      })
      return NextResponse.json({ role: 'ADMIN', tripId: null })
    }

    const accessCode = await prisma.accessCode.findUnique({ where: { code } })
    if (!accessCode) {
      throw new ApiError('NOT_FOUND', 'Invalid access code.')
    }

    await prisma.tripMembership.upsert({
      where: {
        clerkUserId_tripId_role: {
          clerkUserId,
          tripId: accessCode.tripId,
          role: accessCode.role,
        },
      },
      update: {},
      create: { clerkUserId, tripId: accessCode.tripId, role: accessCode.role },
    })

    return NextResponse.json({ role: accessCode.role, tripId: accessCode.tripId })
  } catch (error) {
    return handleApiError(error)
  }
}
