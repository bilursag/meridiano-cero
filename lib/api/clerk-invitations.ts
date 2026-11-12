import { z } from 'zod'
import { clerkClient } from '@clerk/nextjs/server'
import { isClerkAPIResponseError } from '@clerk/nextjs/errors'
import { ApiError } from '@/lib/api/errors'

type ClerkClient = Awaited<ReturnType<typeof clerkClient>>
type InvitationMetadata = Record<string, unknown>

/** Body of the invite endpoints. Clerk matches emails case-insensitively, so compare them lowercased. */
export const inviteBodySchema = z.object({ emailAddress: z.string().trim().toLowerCase().pipe(z.email()) })

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

function pendingTripId(metadata: InvitationMetadata): string | null {
  const invite = metadata.pendingTripInvite as { tripId?: unknown } | undefined
  return typeof invite?.tripId === 'string' ? invite.tripId : null
}

/** Clerk refuses to invite an email that already has an account, so callers grant access directly to it. */
export async function findUserIdByEmail(client: ClerkClient, emailAddress: string): Promise<string | null> {
  const { data } = await client.users.getUserList({ emailAddress: [emailAddress] })
  return data[0]?.id ?? null
}

/**
 * Emails a Clerk invitation whose metadata /redeem turns into access. Clerk allows one pending
 * invitation per email, so a pending one is replaced (this doubles as "resend") and its metadata
 * kept, letting an admin invite and a trip invite to the same person both apply. A pending invite
 * to a different trip is not overwritten.
 */
export async function sendInvitation(
  client: ClerkClient,
  { emailAddress, origin, publicMetadata }: { emailAddress: string; origin: string; publicMetadata: InvitationMetadata }
) {
  // query is a fuzzy search, so only replace invitations for exactly this email.
  const { data: pending } = await client.invitations.getInvitationList({ status: 'pending', query: emailAddress })
  const previous = pending.filter((invitation) => invitation.emailAddress.toLowerCase() === emailAddress)

  const newTripId = pendingTripId(publicMetadata)
  const otherTripPending = previous.some((invitation) => {
    const tripId = pendingTripId(invitation.publicMetadata ?? {})
    return newTripId !== null && tripId !== null && tripId !== newTripId
  })
  if (otherTripPending) {
    throw new ApiError(
      'VALIDATION_ERROR',
      'Ese correo tiene una invitación pendiente a otro grupo. Podrás agregarlo a este cuando la acepte.'
    )
  }

  const mergedMetadata = Object.assign({}, ...previous.map((invitation) => invitation.publicMetadata ?? {}), publicMetadata)
  await Promise.all(previous.map((invitation) => client.invitations.revokeInvitation(invitation.id)))

  try {
    const invitation = await client.invitations.createInvitation({
      emailAddress,
      // The ticket must land on <SignUp>, which consumes it. A protected page such as /redeem bounces
      // to /sign-in with the ticket buried in redirect_url, and the invitee can no longer use it.
      // After signing up, / sends users without access to /redeem, which claims this metadata.
      redirectUrl: `${origin}/sign-up`,
      notify: true,
      publicMetadata: mergedMetadata,
    })
    return { invitation, resent: previous.length > 0 }
  } catch (error) {
    const message = clerkErrorMessage(error)
    if (message) throw new ApiError('VALIDATION_ERROR', message)
    throw error
  }
}
