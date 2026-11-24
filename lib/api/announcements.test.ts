import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, type DeepMockProxy } from 'vitest-mock-extended'

vi.mock('@/lib/db', () => ({ prisma: mockDeep<PrismaClient>() }))

const { prisma } = await import('@/lib/db')
const { requireTripOpenForAnnouncements, FINISHED_TRIP_ANNOUNCEMENT_MESSAGE } = await import('./announcements')
const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>

beforeEach(() => mockReset(prismaMock))

describe('requireTripOpenForAnnouncements', () => {
  it.each(['PENDING', 'IN_TRANSIT', 'IN_ACTIVITY', 'RESTING'])('lets a %s trip publish', async (status) => {
    prismaMock.trip.findUnique.mockResolvedValue({ status } as never)
    await expect(requireTripOpenForAnnouncements('trip-1')).resolves.toBeUndefined()
  })

  it('refuses a finished trip', async () => {
    prismaMock.trip.findUnique.mockResolvedValue({ status: 'FINISHED' } as never)
    await expect(requireTripOpenForAnnouncements('trip-1')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: FINISHED_TRIP_ANNOUNCEMENT_MESSAGE,
    })
  })

  it('answers not found for a trip that does not exist', async () => {
    prismaMock.trip.findUnique.mockResolvedValue(null)
    await expect(requireTripOpenForAnnouncements('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
