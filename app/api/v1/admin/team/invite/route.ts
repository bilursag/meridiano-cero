import { NextResponse } from 'next/server'
import { z } from 'zod'
import { clerkClient } from '@clerk/nextjs/server'
import { isClerkAPIResponseError } from '@clerk/nextjs/errors'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'

const bodySchema = z.object({ emailAddress: z.string().trim().toLowerCase().pipe(z.email()) })

// Clerk rejections we can explain to the admin instead of answering 500.
const CLERK_ERROR_MESSAGES: Record<string, string> = {
  form_identifier_exists: 'Ese correo acaba de crear su cuenta. Vuelve a intentarlo para darle acceso.',
  duplicate_record: 'Ya hay una invitación pendiente para ese correo.',
  form_param_format_invalid: 'Ingresa un correo válido.',
}

function clerkErrorMessage(error: unknown): string | null {
  if (!isClerkAPIResponseError(error)) return null
  return error.errors.map((detail) => CLERK_ERROR_MESSAGES[detail.code]).find(Boolean) ?? null
}

/**
 * Grants admin access by email. An existing account becomes admin right away (Clerk refuses to
 * invite an email that already has one); otherwise Clerk emails an invitation that /redeem claims.
 * Inviting the same email again replaces its pending invitation, so it doubles as "resend".
 */
export const POST = withApiHandler(async (request) => {
  await requireAdmin()

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Ingresa un correo válido.')
  const { emailAddress } = parsed.data

  const client = await clerkClient()
  const existing = (await client.users.getUserList({ emailAddress: [emailAddress] })).data[0]

  if (existing) {
    const { count: created } = await prisma.adminUser.createMany({
      data: { clerkUserId: existing.id },
      skipDuplicates: true,
    })
    if (created === 0) throw new ApiError('VALIDATION_ERROR', 'Ese correo ya tiene acceso de administrador.')
    return NextResponse.json({ result: 'granted', clerkUserId: existing.id }, { status: 201 })
  }

  // query is a fuzzy search, so only revoke invitations for exactly this email.
  const pending = (await client.invitations.getInvitationList({ status: 'pending', query: emailAddress })).data
  const previous = pending.filter((invitation) => invitation.emailAddress.toLowerCase() === emailAddress)
  await Promise.all(previous.map((invitation) => client.invitations.revokeInvitation(invitation.id)))

  try {
    const invitation = await client.invitations.createInvitation({
      emailAddress,
      redirectUrl: `${new URL(request.url).origin}/redeem`,
      notify: true,
      publicMetadata: { pendingAdminInvite: true },
    })
    return NextResponse.json({ result: 'invited', resent: previous.length > 0, invitation }, { status: 201 })
  } catch (error) {
    const message = clerkErrorMessage(error)
    if (message) throw new ApiError('VALIDATION_ERROR', message)
    throw error
  }
})
