import { describe, expect, it } from 'vitest'
import { isVersionAtLeast, tripStatusForClient, withClientTripStatus } from './client-compat'

function request(headers: Record<string, string>) {
  return new Request('https://app.meridianocero.cl/api/v1/trips/t1', { headers })
}

const appWithoutVersion = request({ authorization: 'Bearer jwt' })
const app10 = request({ authorization: 'Bearer jwt', 'x-app-version': '1.0.0' })
const app11 = request({ authorization: 'Bearer jwt', 'x-app-version': '1.1.0' })
const webPanel = request({ cookie: '__session=abc' })

describe('isVersionAtLeast', () => {
  it('compares major, minor and patch numerically', () => {
    expect(isVersionAtLeast('1.1.0', '1.1.0')).toBe(true)
    expect(isVersionAtLeast('1.10.0', '1.9.3')).toBe(true)
    expect(isVersionAtLeast('2.0', '1.1.0')).toBe(true)
    expect(isVersionAtLeast('1.0.9', '1.1.0')).toBe(false)
  })

  it('treats an unreadable version as too old', () => {
    expect(isVersionAtLeast('', '1.1.0')).toBe(false)
    expect(isVersionAtLeast('beta', '1.1.0')).toBe(false)
  })
})

describe('tripStatusForClient', () => {
  it('shows Pendiente as En ruta to apps that predate it', () => {
    expect(tripStatusForClient('PENDING', appWithoutVersion)).toBe('IN_TRANSIT')
    expect(tripStatusForClient('PENDING', app10)).toBe('IN_TRANSIT')
  })

  it('sends Pendiente to 1.1 apps and to the web panel', () => {
    expect(tripStatusForClient('PENDING', app11)).toBe('PENDING')
    expect(tripStatusForClient('PENDING', webPanel)).toBe('PENDING')
  })

  it('leaves every other status alone', () => {
    expect(tripStatusForClient('RESTING', app10)).toBe('RESTING')
    expect(tripStatusForClient('FINISHED', appWithoutVersion)).toBe('FINISHED')
  })
})

describe('withClientTripStatus', () => {
  it('returns a copy only when the status changes', () => {
    const trip = { id: 't1', status: 'PENDING' as const }
    expect(withClientTripStatus(trip, app10)).toEqual({ id: 't1', status: 'IN_TRANSIT' })
    expect(withClientTripStatus(trip, app11)).toBe(trip)
  })
})
