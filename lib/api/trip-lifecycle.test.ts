import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, type DeepMockProxy } from 'vitest-mock-extended'

vi.mock('@/lib/db', () => ({ prisma: mockDeep<PrismaClient>() }))

const { prisma } = await import('@/lib/db')
const { chileStartOfDay, startPendingTripOnLocation } = await import('./trip-lifecycle')
const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>

beforeEach(() => {
  mockReset(prismaMock)
})

// 10:00 in Chile on 9 November 2026 (summer time, UTC-3).
const now = new Date('2026-11-09T13:00:00Z')
const chileMidnightToday = new Date('2026-11-09T03:00:00Z')

describe('chileStartOfDay', () => {
  it("returns Chile's midnight of that date, also late in the evening", () => {
    expect(chileStartOfDay(now)).toEqual(chileMidnightToday)
    // 23:30 in Chile is already the next day in UTC.
    expect(chileStartOfDay(new Date('2026-11-10T02:30:00Z'))).toEqual(chileMidnightToday)
  })
})

describe('startPendingTripOnLocation', () => {
  it('moves only a Pendiente trip whose dates include today to En ruta', async () => {
    prismaMock.trip.updateMany.mockResolvedValue({ count: 1 })
    expect(await startPendingTripOnLocation('trip-1', now)).toBe(true)
    expect(prismaMock.trip.updateMany).toHaveBeenCalledWith({
      where: { id: 'trip-1', status: 'PENDING', startDate: { lte: now }, endDate: { gte: chileMidnightToday } },
      data: { status: 'IN_TRANSIT' },
    })
  })

  it('reports when nothing changed (already started, or outside its dates)', async () => {
    prismaMock.trip.updateMany.mockResolvedValue({ count: 0 })
    expect(await startPendingTripOnLocation('trip-1', now)).toBe(false)
  })
})
