import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, type DeepMockProxy } from 'vitest-mock-extended'

vi.mock('@/lib/db', () => ({ prisma: mockDeep<PrismaClient>() }))

const { prisma } = await import('@/lib/db')
const { chileStartOfDay, finishEndedTrips, startPendingTripOnLocation } = await import('./trip-lifecycle')
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

describe('finishEndedTrips', () => {
  it('finishes every unfinished trip past noon of the day after its last one, Pendiente included', async () => {
    prismaMock.trip.updateMany.mockResolvedValue({ count: 2 })
    expect(await finishEndedTrips(now)).toBe(2)
    // 36 h before 10:00 on 9 Nov is 22:00 on 7 Nov: a trip whose last day was 7 Nov is closed.
    expect(prismaMock.trip.updateMany).toHaveBeenCalledWith({
      where: { status: { not: 'FINISHED' }, endDate: { lt: new Date('2026-11-08T01:00:00Z') } },
      data: { status: 'FINISHED' },
    })
  })

  it('keeps a trip whose last day was yesterday open until noon in Chile', async () => {
    prismaMock.trip.updateMany.mockResolvedValue({ count: 0 })
    const yesterdayMidnight = new Date('2026-11-08T03:00:00Z')
    const cutoff = (at: string) => {
      prismaMock.trip.updateMany.mockClear()
      return finishEndedTrips(new Date(at)).then(
        () => (prismaMock.trip.updateMany.mock.calls[0][0] as { where: { endDate: { lt: Date } } }).where.endDate.lt
      )
    }
    // 11:59 in Chile: still open (the way home overnight is on the map).
    expect(yesterdayMidnight < (await cutoff('2026-11-09T14:59:00Z'))).toBe(false)
    // 12:01 in Chile: closed.
    expect(yesterdayMidnight < (await cutoff('2026-11-09T15:01:00Z'))).toBe(true)
  })
})
