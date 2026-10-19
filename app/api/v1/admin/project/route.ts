import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'
import { getProjectBoard } from '@/lib/trello'

export const GET = withApiHandler(async () => {
  await requireAdmin()
  return NextResponse.json(await getProjectBoard())
})
