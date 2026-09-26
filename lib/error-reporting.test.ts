import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, type DeepMockProxy } from 'vitest-mock-extended'

vi.mock('@/lib/db', () => ({ prisma: mockDeep<PrismaClient>() }))
vi.mock('@/lib/notifications', () => ({ notifyInBackground: vi.fn() }))

const { prisma } = await import('@/lib/db')
const { reportError } = await import('./error-reporting')
const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>

beforeEach(() => {
  mockReset(prismaMock)
})

describe('reportError', () => {
  it('creates a SYSTEM_ERROR notification with the route, the message and the log reference', async () => {
    prismaMock.notification.findFirst.mockResolvedValue(null)

    await reportError(new Error('Connection   refused\n  at db'), {
      source: 'server',
      path: '/admin/trips?page=2',
      digest: '12345',
    })

    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: {
        type: 'SYSTEM_ERROR',
        title: 'Error en el servidor',
        body: '/admin/trips: Connection refused at db (ref. 12345)',
      },
    })
  })

  it('skips an error already reported within the last hour', async () => {
    prismaMock.notification.findFirst.mockResolvedValue({ id: 'n-1' } as never)

    await reportError(new Error('boom'), { source: 'client', path: '/parent/trip-1' })

    expect(prismaMock.notification.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        type: 'SYSTEM_ERROR',
        title: 'Error en el navegador',
        body: { startsWith: '/parent/trip-1: boom' },
      }),
      select: { id: true },
    })
    expect(prismaMock.notification.create).not.toHaveBeenCalled()
  })

  it('truncates long messages', async () => {
    prismaMock.notification.findFirst.mockResolvedValue(null)

    await reportError(new Error('x'.repeat(500)), { source: 'client', path: '/' })

    const { body } = prismaMock.notification.create.mock.calls[0][0].data
    expect(body).toBe(`/: ${'x'.repeat(300)}…`)
  })

  it('never throws when the database is unavailable', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    prismaMock.notification.findFirst.mockRejectedValue(new Error('db down'))

    await expect(reportError(new Error('boom'), { source: 'server', path: '/' })).resolves.toBeUndefined()
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
