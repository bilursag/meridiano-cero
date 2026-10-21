import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClerkAPIResponseError } from '@clerk/nextjs/errors'

vi.mock('@clerk/nextjs/server', () => ({ clerkClient: vi.fn() }))

const { ApiError } = await import('./errors')
const { findUserIdByEmail, inviteBodySchema, sendInvitation } = await import('./clerk-invitations')

const client = {
  users: { getUserList: vi.fn() },
  invitations: { getInvitationList: vi.fn(), revokeInvitation: vi.fn(), createInvitation: vi.fn() },
}
const clerk = client as unknown as Parameters<typeof sendInvitation>[0]

function send(publicMetadata: Record<string, unknown>) {
  return sendInvitation(clerk, { emailAddress: 'nueva@example.com', origin: 'https://app.example.com', publicMetadata })
}

function pendingInvitation(id: string, emailAddress: string, publicMetadata: Record<string, unknown>) {
  return { id, emailAddress, publicMetadata }
}

function clerkRejection(code: string) {
  return new ClerkAPIResponseError('Clerk rejected the request', {
    status: 422,
    data: [{ code, message: code, long_message: code }],
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  client.invitations.getInvitationList.mockResolvedValue({ data: [] })
  client.invitations.createInvitation.mockResolvedValue({ id: 'inv_new' })
})

describe('inviteBodySchema', () => {
  it('trims and lowercases the email', () => {
    expect(inviteBodySchema.parse({ emailAddress: '  Nueva@Example.com ' })).toEqual({ emailAddress: 'nueva@example.com' })
  })

  it('rejects an invalid email', () => {
    expect(inviteBodySchema.safeParse({ emailAddress: 'no-es-correo@' }).success).toBe(false)
  })
})

describe('findUserIdByEmail', () => {
  it('returns the id of the account with that email, or null', async () => {
    client.users.getUserList.mockResolvedValueOnce({ data: [{ id: 'user_1' }] }).mockResolvedValueOnce({ data: [] })

    expect(await findUserIdByEmail(clerk, 'a@example.com')).toBe('user_1')
    expect(await findUserIdByEmail(clerk, 'b@example.com')).toBeNull()
    expect(client.users.getUserList).toHaveBeenCalledWith({ emailAddress: ['a@example.com'] })
  })
})

describe('sendInvitation', () => {
  it('sends the ticket to /sign-up, where <SignUp> can consume it', async () => {
    const result = await send({ pendingAdminInvite: true })

    expect(result).toEqual({ invitation: { id: 'inv_new' }, resent: false })
    expect(client.invitations.createInvitation).toHaveBeenCalledWith({
      emailAddress: 'nueva@example.com',
      redirectUrl: 'https://app.example.com/sign-up',
      notify: true,
      publicMetadata: { pendingAdminInvite: true },
    })
  })

  it('replaces a pending invitation for the same email only', async () => {
    client.invitations.getInvitationList.mockResolvedValue({
      data: [
        pendingInvitation('inv_same', 'Nueva@example.com', { pendingAdminInvite: true }),
        pendingInvitation('inv_other', 'nueva@example.com.ar', { pendingAdminInvite: true }),
      ],
    })

    const result = await send({ pendingAdminInvite: true })

    expect(result.resent).toBe(true)
    expect(client.invitations.revokeInvitation).toHaveBeenCalledTimes(1)
    expect(client.invitations.revokeInvitation).toHaveBeenCalledWith('inv_same')
  })

  it('keeps the pending invitation metadata, so an admin and a trip invite both apply', async () => {
    client.invitations.getInvitationList.mockResolvedValue({
      data: [pendingInvitation('inv_admin', 'nueva@example.com', { pendingAdminInvite: true })],
    })

    await send({ pendingTripInvite: { tripId: 'trip_1', role: 'STUDENT' } })

    expect(client.invitations.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        publicMetadata: { pendingAdminInvite: true, pendingTripInvite: { tripId: 'trip_1', role: 'STUDENT' } },
      })
    )
  })

  it('resends a pending invitation to the same trip', async () => {
    client.invitations.getInvitationList.mockResolvedValue({
      data: [pendingInvitation('inv_trip', 'nueva@example.com', { pendingTripInvite: { tripId: 'trip_1', role: 'STUDENT' } })],
    })

    const result = await send({ pendingTripInvite: { tripId: 'trip_1', role: 'STUDENT' } })

    expect(result.resent).toBe(true)
  })

  it('does not overwrite a pending invitation to a different trip', async () => {
    client.invitations.getInvitationList.mockResolvedValue({
      data: [pendingInvitation('inv_trip', 'nueva@example.com', { pendingTripInvite: { tripId: 'trip_other', role: 'STUDENT' } })],
    })

    await expect(send({ pendingTripInvite: { tripId: 'trip_1', role: 'STUDENT' } })).rejects.toThrow(ApiError)
    expect(client.invitations.revokeInvitation).not.toHaveBeenCalled()
    expect(client.invitations.createInvitation).not.toHaveBeenCalled()
  })

  it('explains a Clerk rejection as a validation error', async () => {
    client.invitations.createInvitation.mockRejectedValue(clerkRejection('form_identifier_exists'))

    await expect(send({ pendingAdminInvite: true })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Ese correo acaba de crear su cuenta. Vuelve a intentarlo para darle acceso.',
    })
  })

  it('rethrows Clerk errors it cannot explain', async () => {
    const error = clerkRejection('internal_clerk_error')
    client.invitations.createInvitation.mockRejectedValue(error)

    await expect(send({ pendingAdminInvite: true })).rejects.toBe(error)
  })
})
