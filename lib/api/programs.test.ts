import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, type DeepMockProxy } from 'vitest-mock-extended'
import { ApiError } from './errors'

vi.mock('@/lib/db', () => ({ prisma: mockDeep<PrismaClient>() }))

const { prisma } = await import('@/lib/db')
const { applyProgramToTrip, duplicateProgram } = await import('./programs')
const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>

beforeEach(() => {
  mockReset(prismaMock)
})

const programItem = (overrides: Partial<{ id: string; dayNumber: number; order: number }> = {}) => ({
  id: overrides.id ?? 'item-1',
  programId: 'program-1',
  dayNumber: overrides.dayNumber ?? 1,
  time: '09:00',
  title: 'Actividad',
  location: 'Lugar',
  description: 'Descripción',
  requirementsMessage: null,
  order: overrides.order ?? 0,
})

describe('applyProgramToTrip', () => {
  it('throws NOT_FOUND when the program does not exist', async () => {
    prismaMock.program.findUnique.mockResolvedValue(null)

    await expect(applyProgramToTrip('trip-1', 'missing-program')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    } satisfies Partial<ApiError>)
  })

  it('throws VALIDATION_ERROR when the program has no items', async () => {
    prismaMock.program.findUnique.mockResolvedValue({
      id: 'program-1',
      name: 'Vacío',
      description: null,
      createdAt: new Date(),
      items: [],
    } as never)

    await expect(applyProgramToTrip('trip-1', 'program-1')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    } satisfies Partial<ApiError>)
  })

  it('copies program items into new itinerary items starting after the last existing order', async () => {
    prismaMock.program.findUnique.mockResolvedValue({
      id: 'program-1',
      name: 'Programa',
      description: null,
      createdAt: new Date(),
      items: [programItem({ id: 'a', dayNumber: 1, order: 0 }), programItem({ id: 'b', dayNumber: 2, order: 1 })],
    } as never)
    prismaMock.itineraryItem.findFirst.mockResolvedValue({ order: 2 } as never)
    prismaMock.itineraryItem.create.mockImplementation((args) => Promise.resolve(args.data) as never)

    const created = await applyProgramToTrip('trip-1', 'program-1')

    expect(created).toHaveLength(2)
    expect(prismaMock.itineraryItem.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({ tripId: 'trip-1', dayNumber: 1, order: 3 }),
    })
    expect(prismaMock.itineraryItem.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({ tripId: 'trip-1', dayNumber: 2, order: 4 }),
    })
  })

  it('starts ordering at 0 when the trip has no existing itinerary items', async () => {
    prismaMock.program.findUnique.mockResolvedValue({
      id: 'program-1',
      name: 'Programa',
      description: null,
      createdAt: new Date(),
      items: [programItem({ id: 'a' })],
    } as never)
    prismaMock.itineraryItem.findFirst.mockResolvedValue(null)
    prismaMock.itineraryItem.create.mockImplementation((args) => Promise.resolve(args.data) as never)

    await applyProgramToTrip('trip-1', 'program-1')

    expect(prismaMock.itineraryItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ order: 0 }),
    })
  })
})

describe('duplicateProgram', () => {
  it('throws NOT_FOUND when the program does not exist', async () => {
    prismaMock.program.findUnique.mockResolvedValue(null)

    await expect(duplicateProgram('missing-program')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    } satisfies Partial<ApiError>)
    expect(prismaMock.program.create).not.toHaveBeenCalled()
  })

  it('creates a "(copia)" with the same description and every activity in one write', async () => {
    prismaMock.program.findUnique.mockResolvedValue({
      id: 'program-1',
      name: 'BRC 107',
      description: 'Bariloche 7 días',
      createdAt: new Date(),
      items: [programItem({ id: 'a', dayNumber: 1, order: 0 }), programItem({ id: 'b', dayNumber: 2, order: 1 })],
    } as never)
    prismaMock.program.create.mockResolvedValue({ id: 'program-2' } as never)

    await duplicateProgram('program-1')

    expect(prismaMock.program.create).toHaveBeenCalledTimes(1)
    const { data } = prismaMock.program.create.mock.calls[0][0]
    expect(data).toMatchObject({ name: 'BRC 107 (copia)', description: 'Bariloche 7 días' })
    expect(data.items?.create).toEqual([
      expect.objectContaining({ dayNumber: 1, order: 0, title: 'Actividad' }),
      expect.objectContaining({ dayNumber: 2, order: 1, title: 'Actividad' }),
    ])
    // The copy gets its own rows, never the original's ids or program.
    expect(JSON.stringify(data.items?.create)).not.toMatch(/"id"|programId/)
  })

  it('copies a program that has no activities yet', async () => {
    prismaMock.program.findUnique.mockResolvedValue({
      id: 'program-1',
      name: 'Vacío',
      description: null,
      createdAt: new Date(),
      items: [],
    } as never)
    prismaMock.program.create.mockResolvedValue({ id: 'program-2' } as never)

    await duplicateProgram('program-1')

    expect(prismaMock.program.create.mock.calls[0][0].data).toMatchObject({ name: 'Vacío (copia)', items: { create: [] } })
  })
})
