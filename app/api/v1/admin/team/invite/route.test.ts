import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClerkAPIResponseError } from '@clerk/nextjs/errors'

const clerk = {
  users: { getUserList: vi.fn() },
  invitations: { getInvitationList: vi.fn(), revokeInvitation: vi.fn(), createInvitation: vi.fn() },
}

vi.mock('@clerk/nextjs/server', () => ({ clerkClient: async () => clerk }))
vi.mock('@/lib/db', () => ({ prisma: { adminUser: { createMany: vi.fn() } } }))
vi.mock('@/lib/api/require-role', () => ({ requireAdmin: vi.fn(async () => ({ clerkUserId: 'user_admin' })) }))
vi.mock('@/lib/error-reporting', () => ({ reportErrorInBackground: vi.fn() }))

const { prisma } = await import('@/lib/db')
const { POST } = await import('./route')
const createAdminMock = vi.mocked(prisma.adminUser.createMany)

const context = { params: Promise.resolve({}) }

function invite(emailAddress: string) {
  const request = new Request('https://app.example.com/api/v1/admin/team/invite', {
    method: 'POST',
    body: JSON.stringify({ emailAddress }),
  })
  return POST(request, context)
}

function clerkRejection(code: string) {
  return new ClerkAPIResponseError('Clerk rejected the request', {
    status: 422,
    data: [{ code, message: code, long_message: code }],
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  clerk.users.getUserList.mockResolvedValue({ data: [] })
  clerk.invitations.getInvitationList.mockResolvedValue({ data: [] })
  clerk.invitations.createInvitation.mockResolvedValue({ id: 'inv_new' })
})

describe('POST /api/v1/admin/team/invite', () => {
  it('makes an existing account admin right away instead of inviting it', async () => {
    clerk.users.getUserList.mockResolvedValue({ data: [{ id: 'user_existing' }] })
    createAdminMock.mockResolvedValue({ count: 1 })

    const response = await invite('  Operaciones@Example.com ')

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ result: 'granted', clerkUserId: 'user_existing' })
    expect(clerk.users.getUserList).toHaveBeenCalledWith({ emailAddress: ['operaciones@example.com'] })
    expect(createAdminMock).toHaveBeenCalledWith({ data: { clerkUserId: 'user_existing' }, skipDuplicates: true })
    expect(clerk.invitations.createInvitation).not.toHaveBeenCalled()
  })

  it('rejects an account that is already admin', async () => {
    clerk.users.getUserList.mockResolvedValue({ data: [{ id: 'user_existing' }] })
    createAdminMock.mockResolvedValue({ count: 0 })

    const response = await invite('operaciones@example.com')

    expect(response.status).toBe(422)
    expect((await response.json()).error.message).toBe('Ese correo ya tiene acceso de administrador.')
  })

  it('invites an email without an account, pointing the link at /redeem', async () => {
    const response = await invite('nueva@example.com')

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ result: 'invited', resent: false })
    expect(clerk.invitations.createInvitation).toHaveBeenCalledWith({
      emailAddress: 'nueva@example.com',
      redirectUrl: 'https://app.example.com/redeem',
      notify: true,
      publicMetadata: { pendingAdminInvite: true },
    })
  })

  it('replaces a pending invitation for the same email only', async () => {
    clerk.invitations.getInvitationList.mockResolvedValue({
      data: [
        { id: 'inv_same', emailAddress: 'Nueva@example.com' },
        { id: 'inv_other', emailAddress: 'nueva@example.com.ar' },
      ],
    })

    const response = await invite('nueva@example.com')

    expect(await response.json()).toMatchObject({ result: 'invited', resent: true })
    expect(clerk.invitations.revokeInvitation).toHaveBeenCalledTimes(1)
    expect(clerk.invitations.revokeInvitation).toHaveBeenCalledWith('inv_same')
  })

  it('explains a Clerk rejection instead of answering 500', async () => {
    clerk.invitations.createInvitation.mockRejectedValue(clerkRejection('form_identifier_exists'))

    const response = await invite('nueva@example.com')

    expect(response.status).toBe(422)
    expect((await response.json()).error.message).toBe(
      'Ese correo acaba de crear su cuenta. Vuelve a intentarlo para darle acceso.'
    )
  })

  it('still answers 500 for Clerk errors it cannot explain', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    clerk.invitations.createInvitation.mockRejectedValue(clerkRejection('internal_clerk_error'))

    const response = await invite('nueva@example.com')

    expect(response.status).toBe(500)
  })

  it('rejects an invalid email before calling Clerk', async () => {
    const response = await invite('no-es-correo@')

    expect(response.status).toBe(422)
    expect(clerk.users.getUserList).not.toHaveBeenCalled()
  })
})
