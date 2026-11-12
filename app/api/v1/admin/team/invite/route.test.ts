import { beforeEach, describe, expect, it, vi } from 'vitest'

const clerk = {}

vi.mock('@clerk/nextjs/server', () => ({ clerkClient: async () => clerk }))
vi.mock('@/lib/db', () => ({ prisma: { adminUser: { createMany: vi.fn() } } }))
vi.mock('@/lib/api/require-role', () => ({ requireAdmin: vi.fn(async () => ({ clerkUserId: 'user_admin' })) }))
vi.mock('@/lib/error-reporting', () => ({ reportErrorInBackground: vi.fn() }))
vi.mock('@/lib/api/clerk-invitations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/clerk-invitations')>()),
  findUserIdByEmail: vi.fn(),
  sendInvitation: vi.fn(),
}))

const { prisma } = await import('@/lib/db')
const { findUserIdByEmail, sendInvitation } = await import('@/lib/api/clerk-invitations')
const { POST } = await import('./route')
const createAdminMock = vi.mocked(prisma.adminUser.createMany)
const findUserMock = vi.mocked(findUserIdByEmail)
const sendInvitationMock = vi.mocked(sendInvitation)

const context = { params: Promise.resolve({}) }

function invite(emailAddress: string) {
  const request = new Request('https://app.example.com/api/v1/admin/team/invite', {
    method: 'POST',
    body: JSON.stringify({ emailAddress }),
  })
  return POST(request, context)
}

beforeEach(() => {
  vi.clearAllMocks()
  findUserMock.mockResolvedValue(null)
  sendInvitationMock.mockResolvedValue({ invitation: { id: 'inv_new' } as never, resent: false })
})

describe('POST /api/v1/admin/team/invite', () => {
  it('makes an existing account admin right away instead of inviting it', async () => {
    findUserMock.mockResolvedValue('user_existing')
    createAdminMock.mockResolvedValue({ count: 1 })

    const response = await invite('  Operaciones@Example.com ')

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ result: 'granted', clerkUserId: 'user_existing' })
    expect(findUserMock).toHaveBeenCalledWith(clerk, 'operaciones@example.com')
    expect(createAdminMock).toHaveBeenCalledWith({ data: { clerkUserId: 'user_existing' }, skipDuplicates: true })
    expect(sendInvitationMock).not.toHaveBeenCalled()
  })

  it('rejects an account that is already admin', async () => {
    findUserMock.mockResolvedValue('user_existing')
    createAdminMock.mockResolvedValue({ count: 0 })

    const response = await invite('operaciones@example.com')

    expect(response.status).toBe(422)
    expect((await response.json()).error.message).toBe('Ese correo ya tiene acceso de administrador.')
  })

  it('invites an email without an account as admin', async () => {
    sendInvitationMock.mockResolvedValue({ invitation: { id: 'inv_new' } as never, resent: true })

    const response = await invite('nueva@example.com')

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ result: 'invited', resent: true })
    expect(sendInvitationMock).toHaveBeenCalledWith(clerk, {
      emailAddress: 'nueva@example.com',
      origin: 'https://app.example.com',
      publicMetadata: { pendingAdminInvite: true },
    })
  })

  it('rejects an invalid email before calling Clerk', async () => {
    const response = await invite('no-es-correo@')

    expect(response.status).toBe(422)
    expect(findUserMock).not.toHaveBeenCalled()
  })
})
