import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, type DeepMockProxy } from 'vitest-mock-extended'

vi.mock('@/lib/db', () => ({ prisma: mockDeep<PrismaClient>() }))

const { prisma } = await import('@/lib/db')
const { pushToUsers } = await import('./push')
const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>
const fetchMock = vi.fn()

const content = {
  title: 'Llegaron a Cerro Catedral',
  body: 'Bariloche: el grupo está en la actividad.',
  target: { screen: 'itinerary' as const, tripId: 'trip-1' },
}

beforeEach(() => {
  mockReset(prismaMock)
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('pushToUsers', () => {
  it('does nothing without devices', async () => {
    prismaMock.pushDevice.findMany.mockResolvedValue([])
    expect(await pushToUsers(['u1'], content)).toEqual({ sent: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends one message per device and forgets unregistered ones', async () => {
    prismaMock.pushDevice.findMany.mockResolvedValue([
      { token: 'ExponentPushToken[a]' },
      { token: 'ExponentPushToken[b]' },
    ] as never)
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            { status: 'ok', id: 't1' },
            { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } },
          ],
        }),
        { status: 200 }
      )
    )

    expect(await pushToUsers(['u1', 'u1', 'u2'], content)).toEqual({ sent: 1 })

    expect(prismaMock.pushDevice.findMany).toHaveBeenCalledWith({
      where: { clerkUserId: { in: ['u1', 'u2'] } },
      select: { token: true },
    })
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toHaveLength(2)
    expect(body[0]).toMatchObject({ to: 'ExponentPushToken[a]', title: content.title, data: content.target, channelId: 'default', threadId: 'trip-1' })
    expect(prismaMock.pushDevice.deleteMany).toHaveBeenCalledWith({ where: { token: { in: ['ExponentPushToken[b]'] } } })
  })

  it('splits more than 100 devices into several requests', async () => {
    prismaMock.pushDevice.findMany.mockResolvedValue(
      Array.from({ length: 150 }, (_, i) => ({ token: `ExponentPushToken[${i}]` })) as never
    )
    fetchMock.mockImplementation(async (_url, init) => {
      const count = JSON.parse(init.body).length
      return new Response(JSON.stringify({ data: Array.from({ length: count }, () => ({ status: 'ok', id: 'x' })) }))
    })

    expect(await pushToUsers(['u1'], content)).toEqual({ sent: 150 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
