import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'
import { markAdminNotificationsSeen } from '@/lib/notifications'

export const POST = withApiHandler(async () => {
  const { clerkUserId } = await requireAdmin()
  await markAdminNotificationsSeen(clerkUserId)

  return NextResponse.json({ ok: true })
})
