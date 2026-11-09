import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, type DeepMockProxy } from 'vitest-mock-extended'

vi.mock('@/lib/db', () => ({ prisma: mockDeep<PrismaClient>() }))
vi.mock('@/lib/push', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/push')>()),
  pushToUsers: vi.fn(),
}))

const { prisma } = await import('@/lib/db')
const { pushToUsers } = await import('@/lib/push')
const { pushActivity } = await import('./push-triggers')
const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>
const pushMock = vi.mocked(pushToUsers)

const item = { title: 'Cerro Catedral', location: 'Bariloche' }

beforeEach(() => {
  mockReset(prismaMock)
  pushMock.mockReset()
  prismaMock.trip.findUnique.mockResolvedValue({ id: 'trip-1', name: '4° Medio B' } as never)
  prismaMock.tripMembership.findMany.mockResolvedValue([
    { clerkUserId: 'parent-1' },
    { clerkUserId: 'parent-admin' },
  ] as never)
  prismaMock.adminUser.findMany.mockResolvedValue([
    { clerkUserId: 'parent-admin' },
    { clerkUserId: 'admin-1' },
    { clerkUserId: 'admin-actor' },
  ] as never)
})

describe('pushActivity', () => {
  it('sends the families one message and the admins another, never both to one person', async () => {
    await pushActivity('trip-1', item, 'PENDING', 'IN_TRANSIT', 'monitor-1')

    expect(pushMock).toHaveBeenCalledTimes(2)
    const [families, admins] = pushMock.mock.calls
    expect(families[0]).toEqual(['parent-1'])
    expect(families[1].title).toBe('En ruta a Cerro Catedral')
    expect(admins[0]).toEqual(['parent-admin', 'admin-1', 'admin-actor'])
    expect(admins[1].title).toBe('4° Medio B: en ruta a Cerro Catedral')
    expect(prismaMock.tripMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clerkUserId: { not: 'monitor-1' } }) })
    )
  })

  it('leaves out the admin who moved the activity', async () => {
    await pushActivity('trip-1', item, 'IN_TRANSIT', 'IN_PROGRESS', 'admin-actor')
    expect(pushMock.mock.calls[1][0]).toEqual(['parent-admin', 'admin-1'])
  })

  it('sends nothing for a step nobody hears about', async () => {
    await pushActivity('trip-1', item, 'IN_PROGRESS', 'COMPLETED', 'monitor-1')
    expect(pushMock).not.toHaveBeenCalled()
    expect(prismaMock.adminUser.findMany).not.toHaveBeenCalled()
  })
})
