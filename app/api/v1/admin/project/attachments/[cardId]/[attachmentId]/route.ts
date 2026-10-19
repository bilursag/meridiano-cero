import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'
import { ApiError } from '@/lib/api/errors'
import { getProjectAttachment } from '@/lib/trello'

const TRELLO_ID = /^[0-9a-f]{24}$/

export const GET = withApiHandler<{ cardId: string; attachmentId: string }>(async (_request, { params }) => {
  await requireAdmin()
  const { cardId, attachmentId } = await params
  if (!TRELLO_ID.test(cardId) || !TRELLO_ID.test(attachmentId)) {
    throw new ApiError('NOT_FOUND', 'No encontramos esa imagen.')
  }

  const { body, contentType } = await getProjectAttachment(cardId, attachmentId)
  return new NextResponse(body, {
    headers: { 'Content-Type': contentType, 'Cache-Control': 'private, max-age=86400' },
  })
})
