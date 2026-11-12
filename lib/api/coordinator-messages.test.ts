import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, type DeepMockProxy } from 'vitest-mock-extended'

vi.mock('@/lib/db', () => ({ prisma: mockDeep<PrismaClient>() }))
vi.mock('@/lib/push', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/push')>()),
  pushToUsers: vi.fn(),
}))

const { prisma } = await import('@/lib/db')
const { pushToUsers } = await import('@/lib/push')
const { sendCoordinatorMessage, TRIPS_IN_FIELD } = await import('./coordinator-messages')
const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>
const pushMock = vi.mocked(pushToUsers)

const input = { title: 'Cambio de horario', message: 'El bus sale a las 8:30.', senderName: 'Ana Pérez' }

beforeEach(() => {
  mockReset(prismaMock)
  pushMock.mockReset().mockResolvedValue({ sent: 1 })
})

describe('sendCoordinatorMessage', () => {
  it("pushes to one trip's coordinators only and records it with the trip", async () => {
    prismaMock.trip.findMany.mockResolvedValue([{ id: 'trip-1', name: '4° Medio B', status: 'IN_ACTIVITY' }] as never)
    prismaMock.tripMembership.findMany.mockResolvedValue([{ clerkUserId: 'monitor-1' }, { clerkUserId: 'monitor-2' }] as never)
    pushMock.mockResolvedValue({ sent: 3 })

    expect(await sendCoordinatorMessage({ ...input, tripId: 'trip-1' })).toEqual({ trips: 1, coordinators: 2, devices: 3 })

    expect(prismaMock.tripMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tripId: 'trip-1', role: { in: ['MONITOR'] } }) })
    )
    expect(pushMock).toHaveBeenCalledWith(['monitor-1', 'monitor-2'], {
      title: 'Equipo central: Cambio de horario',
      body: '4° Medio B · El bus sale a las 8:30.',
      target: { screen: 'home', tripId: 'trip-1' },
    })
    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: {
        type: 'COORDINATOR_MESSAGE',
        title: 'Aviso a coordinadores: Cambio de horario',
        body: '4° Medio B · El bus sale a las 8:30. · Enviado por Ana Pérez: llegó a 3 teléfonos de 2 coordinadores.',
        tripId: 'trip-1',
      },
    })
  })

  it('without a trip, reaches every trip in the field and leaves a single feed entry', async () => {
    prismaMock.trip.findMany.mockResolvedValue([
      { id: 'trip-1', name: 'Atacama', status: 'IN_TRANSIT' },
      { id: 'trip-2', name: 'Pucón', status: 'RESTING' },
    ] as never)
    // The same coordinator on both trips counts once, but gets one push per trip.
    prismaMock.tripMembership.findMany
      .mockResolvedValueOnce([{ clerkUserId: 'monitor-1' }] as never)
      .mockResolvedValueOnce([{ clerkUserId: 'monitor-1' }, { clerkUserId: 'monitor-2' }] as never)

    expect(await sendCoordinatorMessage(input)).toEqual({ trips: 2, coordinators: 2, devices: 2 })

    expect(prismaMock.trip.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: { in: TRIPS_IN_FIELD } } })
    )
    expect(pushMock).toHaveBeenCalledTimes(2)
    expect(pushMock.mock.calls[1][1].body).toBe('Pucón · El bus sale a las 8:30.')
    expect(prismaMock.notification.create).toHaveBeenCalledTimes(1)
    expect(prismaMock.notification.create.mock.calls[0][0].data).toMatchObject({
      tripId: null,
      body: '2 giras en curso · El bus sale a las 8:30. · Enviado por Ana Pérez: llegó a 2 teléfonos de 2 coordinadores.',
    })
  })

  it('refuses a finished trip, an unknown trip, and an empty field without sending anything', async () => {
    prismaMock.trip.findMany.mockResolvedValueOnce([{ id: 'trip-1', name: 'Atacama', status: 'FINISHED' }] as never)
    await expect(sendCoordinatorMessage({ ...input, tripId: 'trip-1' })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })

    prismaMock.trip.findMany.mockResolvedValueOnce([] as never)
    await expect(sendCoordinatorMessage({ ...input, tripId: 'nope' })).rejects.toMatchObject({ code: 'NOT_FOUND' })

    prismaMock.trip.findMany.mockResolvedValueOnce([] as never)
    await expect(sendCoordinatorMessage(input)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })

    expect(pushMock).not.toHaveBeenCalled()
    expect(prismaMock.notification.create).not.toHaveBeenCalled()
  })

  it('records a send that reached no phone, so the panel can warn about it', async () => {
    prismaMock.trip.findMany.mockResolvedValue([{ id: 'trip-1', name: 'Atacama', status: 'PENDING' }] as never)
    prismaMock.tripMembership.findMany.mockResolvedValue([{ clerkUserId: 'monitor-1' }] as never)
    pushMock.mockResolvedValue({ sent: 0 })

    expect(await sendCoordinatorMessage({ ...input, tripId: 'trip-1' })).toEqual({ trips: 1, coordinators: 1, devices: 0 })
    expect(prismaMock.notification.create.mock.calls[0][0].data.body).toContain('llegó a 0 teléfonos de 1 coordinador.')
  })
})
