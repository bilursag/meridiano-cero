import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ApiError, handleApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ clerkUserId: string }> }
) {
  try {
    const { clerkUserId: currentUserId } = await requireAdmin()
    const { clerkUserId } = await params

    if (clerkUserId === currentUserId) {
      throw new ApiError('VALIDATION_ERROR', 'You cannot remove your own admin access.')
    }

    await prisma.adminUser.delete({ where: { clerkUserId } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
