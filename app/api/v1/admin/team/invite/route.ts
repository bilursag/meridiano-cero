import { NextResponse } from 'next/server'
import { z } from 'zod'
import { clerkClient } from '@clerk/nextjs/server'
import { ApiError, handleApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'

const bodySchema = z.object({ emailAddress: z.email() })

export async function POST(request: Request) {
  try {
    await requireAdmin()

    const json = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'A valid email address is required.')

    const client = await clerkClient()
    const invitation = await client.invitations.createInvitation({
      emailAddress: parsed.data.emailAddress,
      redirectUrl: `${new URL(request.url).origin}/redeem`,
      notify: true,
    })

    return NextResponse.json({ invitation }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
