import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn(async () => ({ userId: 'user_1' })) }))
vi.mock('@/lib/db', () => ({
  prisma: {
    adminUser: { findUnique: vi.fn() },
    tripMembership: { findMany: vi.fn() },
  },
}))

const { prisma } = await import('@/lib/db')
const { requireTripAccess } = await import('./require-role')
const findAdmin = vi.mocked(prisma.adminUser.findUnique)
const findMemberships = vi.mocked(prisma.tripMembership.findMany)

beforeEach(() => {
  findAdmin.mockReset().mockResolvedValue(null)
  findMemberships.mockReset()
})

describe('requireTripAccess', () => {
  it('answers MONITOR for someone who is both parent and coordinator, whatever the order', async () => {
    findMemberships.mockResolvedValue([{ role: 'PARENT' }, { role: 'MONITOR' }] as never)

    await expect(requireTripAccess('trip_1')).resolves.toEqual({ clerkUserId: 'user_1', role: 'MONITOR' })
  })

  it('answers the only role a member has', async () => {
    findMemberships.mockResolvedValue([{ role: 'STUDENT' }] as never)

    await expect(requireTripAccess('trip_1')).resolves.toEqual({ clerkUserId: 'user_1', role: 'STUDENT' })
  })

  it('refuses someone with no membership on the trip', async () => {
    findMemberships.mockResolvedValue([])

    await expect(requireTripAccess('trip_1')).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('answers ADMIN for an admin without looking at memberships', async () => {
    findAdmin.mockResolvedValue({ clerkUserId: 'user_1' } as never)

    await expect(requireTripAccess('trip_1')).resolves.toEqual({ clerkUserId: 'user_1', role: 'ADMIN' })
    expect(findMemberships).not.toHaveBeenCalled()
  })
})
