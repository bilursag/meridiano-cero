import { describe, expect, it } from 'vitest'
import { MAX_PING_AGE_MS, pingBatchSchema, planPingBatch, tripAcceptsTracking } from './location-batch'
import { TRIP_OPEN_AFTER_END_MS } from './trip-status'

const now = new Date('2026-11-20T15:00:00Z')
const at = (secondsAgo: number) => now.getTime() - secondsAgo * 1000
const point = (secondsAgo: number) => ({ lat: -41.3, lng: -72.9, accuracy: 10, recordedAt: at(secondsAgo) })

describe('pingBatchSchema', () => {
  it('takes the fractional timestamps iOS reports and rounds them, like whole Android ones', () => {
    const ios = { lat: -41.3, lng: -72.9, accuracy: 65.2, recordedAt: 1764072000.123456 * 1000 }
    const android = { ...ios, accuracy: 10, recordedAt: 1764072000123 }
    const parsed = pingBatchSchema.parse({ points: [ios, android] })
    expect(parsed.points.map((p) => p.recordedAt)).toEqual([1764072000123, 1764072000123])
    expect(parsed.points[0].accuracy).toBe(65)
  })

  it('still refuses a missing or negative timestamp', () => {
    expect(pingBatchSchema.safeParse({ points: [{ lat: 0, lng: 0, accuracy: 0, recordedAt: -1 }] }).success).toBe(false)
    expect(pingBatchSchema.safeParse({ points: [{ lat: 0, lng: 0, accuracy: 0 }] }).success).toBe(false)
  })
})

describe('planPingBatch', () => {
  it('keeps points oldest first, at least 5 s apart', () => {
    const planned = planPingBatch([point(10), point(60), point(58), point(30)], null, now)
    expect(planned.map((p) => p.createdAt.getTime())).toEqual([at(60), at(30), at(10)])
  })

  it('skips what is already stored, so a resent batch adds nothing', () => {
    const batch = [point(60), point(30)]
    expect(planPingBatch(batch, new Date(at(30)), now)).toEqual([])
    expect(planPingBatch([...batch, point(5)], new Date(at(30)), now).map((p) => p.createdAt.getTime())).toEqual([at(5)])
  })

  it('stores a fix from the future as now and drops fixes older than a day', () => {
    const future = { ...point(0), recordedAt: now.getTime() + 60_000 }
    const ancient = { ...point(0), recordedAt: now.getTime() - MAX_PING_AGE_MS - 1 }
    const planned = planPingBatch([future, ancient], null, now)
    expect(planned).toHaveLength(1)
    expect(planned[0].createdAt).toEqual(now)
  })
})

describe('tripAcceptsTracking', () => {
  const endDate = new Date('2026-11-20T03:00:00Z')

  it('refuses finished trips', () => {
    expect(tripAcceptsTracking({ status: 'FINISHED', endDate }, new Date(endDate.getTime() - 1))).toBe(false)
  })

  it('accepts until the grace period after the last day ends', () => {
    expect(tripAcceptsTracking({ status: 'IN_TRANSIT', endDate }, new Date(endDate.getTime() + TRIP_OPEN_AFTER_END_MS))).toBe(true)
    expect(tripAcceptsTracking({ status: 'RESTING', endDate }, new Date(endDate.getTime() + TRIP_OPEN_AFTER_END_MS + 1))).toBe(false)
  })
})
