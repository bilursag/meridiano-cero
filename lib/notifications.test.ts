import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, type DeepMockProxy } from 'vitest-mock-extended'

vi.mock('@/lib/db', () => ({ prisma: mockDeep<PrismaClient>() }))
vi.mock('@/lib/api/clerk-users', () => ({ describeUsers: vi.fn() }))
vi.mock('next/server', () => ({ after: vi.fn() }))

const { prisma } = await import('@/lib/db')
const { describeUsers } = await import('@/lib/api/clerk-users')
const { after } = await import('next/server')
const {
  getAdminNotifications,
  notifyAnnouncement,
  notifyInBackground,
  notifyMonitorJoined,
  notifyTripStatusChanged,
} = await import('./notifications')
const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>
const describeUsersMock = vi.mocked(describeUsers)
const afterMock = vi.mocked(after)

beforeEach(() => {
  mockReset(prismaMock)
  describeUsersMock.mockReset()
  afterMock.mockReset()
})

describe('notifyAnnouncement', () => {
  it('ignores INFO announcements so itinerary transitions do not flood the feed', async () => {
    await notifyAnnouncement('trip-1', { type: 'INFO', title: 'En ruta', authorName: 'Ana' })

    expect(prismaMock.trip.findUnique).not.toHaveBeenCalled()
    expect(prismaMock.notification.create).not.toHaveBeenCalled()
  })

  it('creates a TRIP_ALERT notification naming the trip and the author', async () => {
    prismaMock.trip.findUnique.mockResolvedValue({ name: 'Bariloche 4°B' } as never)

    await notifyAnnouncement('trip-1', { type: 'ALERT', title: 'Alumno con fiebre', authorName: 'Ana Pérez' })

    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: {
        type: 'TRIP_ALERT',
        tripId: 'trip-1',
        title: 'Alerta en Bariloche 4°B',
        body: 'Ana Pérez: Alumno con fiebre',
      },
    })
  })

  it('creates a TRIP_ACHIEVEMENT notification for achievements', async () => {
    prismaMock.trip.findUnique.mockResolvedValue({ name: 'Pucón 3°A' } as never)

    await notifyAnnouncement('trip-1', { type: 'ACHIEVEMENT', title: 'Cumbre', authorName: 'Luis' })

    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'TRIP_ACHIEVEMENT', title: 'Logro en Pucón 3°A' }),
    })
  })

  it('does nothing when the trip no longer exists', async () => {
    prismaMock.trip.findUnique.mockResolvedValue(null)

    await notifyAnnouncement('trip-1', { type: 'ALERT', title: 'x', authorName: 'y' })

    expect(prismaMock.notification.create).not.toHaveBeenCalled()
  })
})

describe('notifyMonitorJoined', () => {
  it('names the coordinator from Clerk', async () => {
    prismaMock.trip.findUnique.mockResolvedValue({ name: 'Rapa Nui 4°C' } as never)
    describeUsersMock.mockResolvedValue(
      new Map([['user-1', { clerkUserId: 'user-1', name: 'María Soto', email: '', imageUrl: '' }]])
    )

    await notifyMonitorJoined('trip-1', 'user-1')

    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: {
        type: 'MONITOR_JOINED',
        tripId: 'trip-1',
        title: 'Nuevo coordinador en Rapa Nui 4°C',
        body: 'María Soto se unió al grupo como coordinador.',
      },
    })
  })
})

describe('notifyTripStatusChanged', () => {
  it('uses the Spanish status label', async () => {
    await notifyTripStatusChanged({ id: 'trip-1', name: 'Atacama 2°A' }, 'FINISHED')

    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'TRIP_STATUS_CHANGED',
        title: 'Cambio de estado en Atacama 2°A',
        body: 'El coordinador marcó el grupo como «Finalizado».',
      }),
    })
  })
})

describe('notifyInBackground', () => {
  it('schedules the task with after() and swallows its errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    notifyInBackground(() => Promise.reject(new Error('boom')))

    const callback = afterMock.mock.calls[0][0] as () => Promise<void>
    await expect(callback()).resolves.toBeUndefined()
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

describe('getAdminNotifications', () => {
  it('counts only notifications newer than the last time the admin opened the bell', async () => {
    const seenAt = new Date('2026-09-20T12:00:00.000Z')
    prismaMock.adminUser.findUnique.mockResolvedValue({ createdAt: new Date(0), notificationsSeenAt: seenAt } as never)
    prismaMock.notification.findMany.mockResolvedValue([])
    prismaMock.notification.count.mockResolvedValue(3)

    const result = await getAdminNotifications('admin-1')

    expect(prismaMock.notification.count).toHaveBeenCalledWith({ where: { createdAt: { gt: seenAt } } })
    expect(result).toMatchObject({ unreadCount: 3, seenAt })
  })

  it('falls back to the admin creation date so a new admin does not start with the whole history unread', async () => {
    const createdAt = new Date('2026-09-24T00:00:00.000Z')
    prismaMock.adminUser.findUnique.mockResolvedValue({ createdAt, notificationsSeenAt: null } as never)
    prismaMock.notification.findMany.mockResolvedValue([])
    prismaMock.notification.count.mockResolvedValue(0)

    await getAdminNotifications('admin-1')

    expect(prismaMock.notification.count).toHaveBeenCalledWith({ where: { createdAt: { gt: createdAt } } })
  })
})
