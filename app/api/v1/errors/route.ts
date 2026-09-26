import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiError } from '@/lib/api/errors'
import { requireAuthenticated } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'
import { reportError } from '@/lib/error-reporting'

// Signed-in users only, so the admin feed can't be spammed anonymously.
const bodySchema = z.object({
  message: z.string().max(2000),
  path: z.string().max(500),
})

export const POST = withApiHandler(async (request) => {
  await requireAuthenticated()

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Invalid error report.')

  await reportError(new Error(parsed.data.message), { source: 'client', path: parsed.data.path })

  return NextResponse.json({ ok: true })
})
