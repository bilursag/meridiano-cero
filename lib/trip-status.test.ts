import { describe, expect, it } from 'vitest'
import { tripStatusAfterActivity } from './trip-status'

describe('tripStatusAfterActivity', () => {
  it('puts the group on the road with "En ruta" and at the activity with "En actividad"', () => {
    expect(tripStatusAfterActivity('IN_TRANSIT', 'IN_ACTIVITY')).toBe('IN_TRANSIT')
    expect(tripStatusAfterActivity('PENDING', 'IN_ACTIVITY')).toBe('IN_TRANSIT')
    expect(tripStatusAfterActivity('PENDING', 'RESTING')).toBe('IN_TRANSIT')
    expect(tripStatusAfterActivity('IN_PROGRESS', 'IN_TRANSIT')).toBe('IN_ACTIVITY')
    expect(tripStatusAfterActivity('IN_PROGRESS', 'RESTING')).toBe('IN_ACTIVITY')
  })

  it('leaves the group as it was with "Terminada"', () => {
    expect(tripStatusAfterActivity('COMPLETED', 'IN_ACTIVITY')).toBeNull()
    expect(tripStatusAfterActivity('COMPLETED', 'IN_TRANSIT')).toBeNull()
  })

  it('skips writes when nothing changes and never reopens a finished trip', () => {
    expect(tripStatusAfterActivity('PENDING', 'IN_TRANSIT')).toBeNull()
    expect(tripStatusAfterActivity('IN_PROGRESS', 'IN_ACTIVITY')).toBeNull()
    expect(tripStatusAfterActivity('IN_TRANSIT', 'IN_TRANSIT')).toBeNull()
    expect(tripStatusAfterActivity('PENDING', 'FINISHED')).toBeNull()
    expect(tripStatusAfterActivity('IN_PROGRESS', 'FINISHED')).toBeNull()
  })
})
