import { describe, expect, it } from 'vitest'
import { activityPush, announcementPush, noSignalPush } from './push-messages'

const trip = { id: 'trip-1', name: '4° Medio B – Bariloche' }

describe('announcementPush', () => {
  it('prefixes alerts and opens the comunicado', () => {
    const push = announcementPush(trip, { id: 'a-1', type: 'ALERT', title: 'Cambio de hotel', message: 'Dormimos en el Hotel Sur.' })
    expect(push.title).toBe('Alerta: Cambio de hotel')
    expect(push.body).toBe('4° Medio B – Bariloche · Dormimos en el Hotel Sur.')
    expect(push.target).toEqual({ screen: 'announcement', tripId: 'trip-1', announcementId: 'a-1' })
  })

  it('keeps plain titles for INFO and clips long messages to one line', () => {
    const push = announcementPush(trip, { id: 'a-2', type: 'INFO', title: 'Requisitos: Cerro Catedral', message: 'Llevar\n\nropa '.repeat(60) })
    expect(push.title).toBe('Requisitos: Cerro Catedral')
    expect(push.body.length).toBeLessThanOrEqual(180)
    expect(push.body).not.toContain('\n')
    expect(push.body.endsWith('…')).toBe(true)
  })
})

describe('activityPush', () => {
  const item = { title: 'Cerro Catedral', location: 'Bariloche' }

  it('announces heading out and arriving', () => {
    expect(activityPush(trip, item, 'PENDING', 'IN_TRANSIT')?.title).toBe('En ruta a Cerro Catedral')
    const arrived = activityPush(trip, item, 'IN_TRANSIT', 'IN_PROGRESS')
    expect(arrived?.title).toBe('Llegaron a Cerro Catedral')
    expect(arrived?.target).toEqual({ screen: 'itinerary', tripId: 'trip-1' })
  })

  it('stays quiet for repeats, finishing and going back', () => {
    expect(activityPush(trip, item, 'IN_TRANSIT', 'IN_TRANSIT')).toBeNull()
    expect(activityPush(trip, item, 'IN_PROGRESS', 'COMPLETED')).toBeNull()
    expect(activityPush(trip, item, 'IN_TRANSIT', 'PENDING')).toBeNull()
  })

  it('leaves out an empty place', () => {
    expect(activityPush(trip, { title: 'Cena', location: '' }, 'PENDING', 'IN_PROGRESS')?.body).toBe(
      '4° Medio B – Bariloche: el grupo está en la actividad.'
    )
  })
})

describe('noSignalPush', () => {
  it('opens the coordinator home of the trip', () => {
    expect(noSignalPush(trip).target).toEqual({ screen: 'home', tripId: 'trip-1' })
  })
})
