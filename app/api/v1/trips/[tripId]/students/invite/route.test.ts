import { beforeEach, describe, expect, it, vi } from 'vitest'

const clerk = {}

vi.mock('@clerk/nextjs/server', () => ({ clerkClient: async () => clerk }))
vi.mock('@/lib/db', () => ({
  prisma: { trip: { findUnique: vi.fn() }, tripMembership: { createMany: vi.fn() } },
}))
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
const findTripMock = vi.mocked(prisma.trip.findUnique)
const createMembershipMock = vi.mocked(prisma.tripMembership.createMany)
const findUserMock = vi.mocked(findUserIdByEmail)
const sendInvitationMock = vi.mocked(sendInvitation)

const context = { params: Promise.resolve({ tripId: 'trip_1' }) }

function invite(emailAddress: string) {
  const request = new Request('https://app.example.com/api/v1/trips/trip_1/students/invite', {
    method: 'POST',
    body: JSON.stringify({ emailAddress }),
  })
  return POST(request, context)
}

beforeEach(() => {
  vi.clearAllMocks()
  findTripMock.mockResolvedValue({ id: 'trip_1' } as never)
  findUserMock.mockResolvedValue(null)
  sendInvitationMock.mockResolvedValue({ invitation: { id: 'inv_new' } as never, resent: false })
})

describe('POST /api/v1/trips/[tripId]/students/invite', () => {
  it('adds an existing account to the trip right away instead of inviting it', async () => {
    findUserMock.mockResolvedValue('user_existing')
    createMembershipMock.mockResolvedValue({ count: 1 })

    const response = await invite('Alumno@Example.com')

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ result: 'added', clerkUserId: 'user_existing' })
    expect(createMembershipMock).toHaveBeenCalledWith({
      data: { clerkUserId: 'user_existing', tripId: 'trip_1', role: 'STUDENT' },
      skipDuplicates: true,
    })
    expect(sendInvitationMock).not.toHaveBeenCalled()
  })

  it('rejects an account that is already a student of this trip', async () => {
    findUserMock.mockResolvedValue('user_existing')
    createMembershipMock.mockResolvedValue({ count: 0 })

    const response = await invite('alumno@example.com')

    expect(response.status).toBe(422)
    expect((await response.json()).error.message).toBe('Ese correo ya es alumno de este grupo.')
  })

  it('invites an email without an account to this trip', async () => {
    const response = await invite('alumno@example.com')

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ result: 'invited', resent: false })
    expect(sendInvitationMock).toHaveBeenCalledWith(clerk, {
      emailAddress: 'alumno@example.com',
      origin: 'https://app.example.com',
      publicMetadata: { pendingTripInvite: { tripId: 'trip_1', role: 'STUDENT' } },
    })
  })

  it('answers 404 for an unknown trip', async () => {
    findTripMock.mockResolvedValue(null)

    const response = await invite('alumno@example.com')

    expect(response.status).toBe(404)
    expect(findUserMock).not.toHaveBeenCalled()
  })
})
