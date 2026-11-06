/** Same spacing the single-ping endpoint enforces: the map and the alerts never need more. */
export const MIN_PING_GAP_MS = 5_000

/** Fixes older than this are dropped: a phone that was off for days has nothing useful to add. */
export const MAX_PING_AGE_MS = 24 * 60 * 60 * 1000

/** How long after its last day a trip still accepts locations (the way home, late arrivals). */
export const TRACKING_GRACE_AFTER_END_MS = 36 * 60 * 60 * 1000

export type BatchPoint = { lat: number; lng: number; accuracy: number; recordedAt: number }
export type PlannedPing = { lat: number; lng: number; accuracy: number; createdAt: Date }

/**
 * Picks the points of a batch to store. The phone queues fixes while it has no signal and sends
 * them oldest first, and it resends a batch whose answer it never got, so only points newer than
 * what is already stored are kept, at least MIN_PING_GAP_MS apart. That makes a resend a no-op.
 * Clock skew: a fix "from the future" is stored as now.
 */
export function planPingBatch(points: BatchPoint[], lastStoredAt: Date | null, now: Date): PlannedPing[] {
  const nowMs = now.getTime()
  const sorted = points
    .map((point) => ({ ...point, recordedAt: Math.min(point.recordedAt, nowMs) }))
    .filter((point) => nowMs - point.recordedAt <= MAX_PING_AGE_MS)
    .sort((a, b) => a.recordedAt - b.recordedAt)

  const planned: PlannedPing[] = []
  let lastMs = lastStoredAt?.getTime() ?? -Infinity
  for (const point of sorted) {
    if (point.recordedAt - lastMs < MIN_PING_GAP_MS) continue
    planned.push({ lat: point.lat, lng: point.lng, accuracy: point.accuracy, createdAt: new Date(point.recordedAt) })
    lastMs = point.recordedAt
  }
  return planned
}

/** Whether a trip still takes locations: not finished, and not long past its last day. */
export function tripAcceptsTracking(trip: { status: string; endDate: Date }, now: Date): boolean {
  if (trip.status === 'FINISHED') return false
  return now.getTime() <= trip.endDate.getTime() + TRACKING_GRACE_AFTER_END_MS
}
