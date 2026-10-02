import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

/** Revokes admin access. Granting it is deliberately invite-only (see /api/v1/admin/team/invite). */
export const DELETE = withApiHandler<{ clerkUserId: string }>(async (_request, { params }) => {
  const { clerkUserId: currentUserId } = await requireAdmin()
  const { clerkUserId } = await params

  if (clerkUserId === currentUserId) {
    throw new ApiError('VALIDATION_ERROR', 'No puedes quitarte tu propio acceso de administrador.')
  }

  await prisma.adminUser.delete({ where: { clerkUserId } })

  return NextResponse.json({ ok: true })
})
