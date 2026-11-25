import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

vi.mock('@/lib/error-reporting', () => ({ reportErrorInBackground: vi.fn() }))

const { reportErrorInBackground } = await import('@/lib/error-reporting')
const { ApiError } = await import('./errors')
const { withApiHandler } = await import('./handler')
const reportMock = vi.mocked(reportErrorInBackground)

const request = new Request('https://example.com/api/v1/trips')
const context = { params: Promise.resolve({}) }

beforeEach(() => {
  reportMock.mockReset()
})

describe('withApiHandler', () => {
  it('reports unexpected errors and answers 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('boom')
    const handler = withApiHandler(async () => {
      throw error
    })

    const response = await handler(request, context)

    expect(response.status).toBe(500)
    expect(reportMock).toHaveBeenCalledWith(error, request)
  })

  it('does not report expected rejections such as a 403', async () => {
    const handler = withApiHandler(async () => {
      throw new ApiError('FORBIDDEN', 'No tienes acceso.')
    })

    const response = await handler(request, context)

    expect(response.status).toBe(403)
    expect(reportMock).not.toHaveBeenCalled()
  })

  it('logs a rejected payload with the fields at fault, without reporting it as a bug', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const parsed = z.object({ recordedAt: z.number().int() }).safeParse({ recordedAt: 1.5 })
    const handler = withApiHandler(async () => {
      if (parsed.success) throw new Error('expected a failure')
      throw new ApiError('VALIDATION_ERROR', 'Las ubicaciones enviadas no son válidas.', parsed.error)
    })

    const response = await handler(new Request('https://example.com/api/tracking/locations', { method: 'POST' }), context)

    expect(response.status).toBe(422)
    expect(reportMock).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/^\[422\] POST \/api\/tracking\/locations — Las ubicaciones enviadas no son válidas\. — recordedAt: .*int/)
    )
  })
})
