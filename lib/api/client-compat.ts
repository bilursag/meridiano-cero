import type { TripStatus } from '@prisma/client'

/**
 * Keeps older mobile app builds working when the API learns something they don't.
 *
 * The 1.0 store app crashes on a TripStatus it doesn't know (its status badge looks the label up in
 * a fixed table), and it can't be patched over the air. From 1.1 the app sends its version in
 * `X-App-Version`. A request is from an older app when it carries a Bearer token (only the app
 * authenticates that way; the web panel uses its session cookie) and no version, or a lower one.
 */

export const APP_VERSION_HEADER = 'x-app-version'
export const PENDING_STATUS_MIN_APP_VERSION = '1.1.0'

function parseVersion(version: string): number[] | null {
  const match = version.trim().match(/^(\d+)\.(\d+)(?:\.(\d+))?/)
  return match ? [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)] : null
}

export function isVersionAtLeast(version: string, minimum: string): boolean {
  const current = parseVersion(version)
  const required = parseVersion(minimum)
  if (!current || !required) return false
  for (let i = 0; i < 3; i++) {
    if (current[i] !== required[i]) return current[i] > required[i]
  }
  return true
}

function isAppOlderThan(request: Request, minimum: string): boolean {
  if (!request.headers.get('authorization')?.startsWith('Bearer ')) return false
  const version = request.headers.get(APP_VERSION_HEADER)
  return !version || !isVersionAtLeast(version, minimum)
}

/** The trip status to show this client: older apps see "Pendiente" as "En ruta", as before it existed. */
export function tripStatusForClient(status: TripStatus, request: Request): TripStatus {
  if (status === 'PENDING' && isAppOlderThan(request, PENDING_STATUS_MIN_APP_VERSION)) return 'IN_TRANSIT'
  return status
}

/** Same as tripStatusForClient, for a trip object about to be sent as JSON. */
export function withClientTripStatus<T extends { status: TripStatus }>(trip: T, request: Request): T {
  const status = tripStatusForClient(trip.status, request)
  return status === trip.status ? trip : { ...trip, status }
}
