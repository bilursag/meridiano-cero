import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, type DeepMockProxy } from 'vitest-mock-extended'
import type { ApiError } from './errors'

vi.mock('@/lib/db', () => ({ prisma: mockDeep<PrismaClient>() }))
vi.mock('./programs', () => ({ applyProgramToTrip: vi.fn() }))

const { prisma } = await import('@/lib/db')
const { applyProgramToTrip } = await import('./programs')
const { createTrip } = await import('./trips')
const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>
const applyProgramToTripMock = vi.mocked(applyProgramToTrip)

beforeEach(() => {
  mockReset(prismaMock)
  applyProgramToTripMock.mockReset()
})

const baseInput = {
  name: 'Grupo de prueba',
  school: 'Colegio de Prueba',
  destination: 'Bariloche, Argentina',
  startDate: new Date('2026-12-03T00:00:00.000Z'),
  endDate: new Date('2026-12-06T00:00:00.000Z'),
  studentCount: 20,
  initialLat: -41.1335,
  initialLng: -71.3103,
  parentCode: 'abc123',
  monitorCode: 'def456',
  studentCode: 'ghi789',
  programId: 'program-1',
}

describe('createTrip', () => {
  it('throws VALIDATION_ERROR when the program does not exist', async () => {
    prismaMock.program.findUnique.mockResolvedValue(null)

    await expect(createTrip(baseInput)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    } satisfies Partial<ApiError>)
    expect(prismaMock.trip.create).not.toHaveBeenCalled()
  })

  it('reuses an existing school matched case-insensitively instead of creating a new one', async () => {
    prismaMock.program.findUnique.mockResolvedValue({ id: 'program-1' } as never)
    prismaMock.school.findFirst.mockResolvedValue({ id: 'school-1', name: 'Colegio de Prueba' } as never)
    prismaMock.trip.create.mockResolvedValue({ id: 'trip-1' } as never)

    await createTrip(baseInput)

    expect(prismaMock.school.findFirst).toHaveBeenCalledWith({
      where: { name: { equals: 'Colegio de Prueba', mode: 'insensitive' } },
    })
    expect(prismaMock.school.create).not.toHaveBeenCalled()
  })

  it('creates a new school when no match is found', async () => {
    prismaMock.program.findUnique.mockResolvedValue({ id: 'program-1' } as never)
    prismaMock.school.findFirst.mockResolvedValue(null)
    prismaMock.school.create.mockResolvedValue({ id: 'school-new', name: 'Colegio de Prueba' } as never)
    prismaMock.trip.create.mockResolvedValue({ id: 'trip-1' } as never)

    await createTrip(baseInput)

    expect(prismaMock.school.create).toHaveBeenCalledWith({ data: { name: 'Colegio de Prueba' } })
  })

  it('computes totalDays and uppercases access codes, and applies the program', async () => {
    prismaMock.program.findUnique.mockResolvedValue({ id: 'program-1' } as never)
    prismaMock.school.findFirst.mockResolvedValue({ id: 'school-1' } as never)
    prismaMock.trip.create.mockResolvedValue({ id: 'trip-1' } as never)

    await createTrip(baseInput)

    expect(prismaMock.trip.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        totalDays: 4,
        schoolId: 'school-1',
        programId: 'program-1',
        accessCodes: {
          create: [
            { code: 'ABC123', role: 'PARENT' },
            { code: 'DEF456', role: 'MONITOR' },
            { code: 'GHI789', role: 'STUDENT' },
          ],
        },
      }),
    })
    expect(applyProgramToTripMock).toHaveBeenCalledWith('trip-1', 'program-1')
  })

  it('omits legs from the create payload when none are given', async () => {
    prismaMock.program.findUnique.mockResolvedValue({ id: 'program-1' } as never)
    prismaMock.school.findFirst.mockResolvedValue({ id: 'school-1' } as never)
    prismaMock.trip.create.mockResolvedValue({ id: 'trip-1' } as never)

    await createTrip(baseInput)

    const call = prismaMock.trip.create.mock.calls[0][0]
    expect(call.data).not.toHaveProperty('legs')
  })

  it('nests leg creation with sequential order when legs are given', async () => {
    prismaMock.program.findUnique.mockResolvedValue({ id: 'program-1' } as never)
    prismaMock.school.findFirst.mockResolvedValue({ id: 'school-1' } as never)
    prismaMock.trip.create.mockResolvedValue({ id: 'trip-1' } as never)

    await createTrip({
      ...baseInput,
      legs: [
        { label: 'Bariloche', lat: -41.1, lng: -71.3 },
        { label: 'Camboriú', lat: -26.99, lng: -48.63 },
      ],
    })

    expect(prismaMock.trip.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        legs: {
          create: [
            { label: 'Bariloche', lat: -41.1, lng: -71.3, order: 0 },
            { label: 'Camboriú', lat: -26.99, lng: -48.63, order: 1 },
          ],
        },
      }),
    })
  })
})
