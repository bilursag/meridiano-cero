import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'
import { getAdminNotifications } from '@/lib/notifications'

export const GET = withApiHandler(async () => {
  const { clerkUserId } = await requireAdmin()

  return NextResponse.json(await getAdminNotifications(clerkUserId))
})
