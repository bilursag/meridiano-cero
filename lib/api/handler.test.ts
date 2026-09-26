import { beforeEach, describe, expect, it, vi } from 'vitest'

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
      throw new ApiError('FORBIDDEN', 'No access.')
    })

    const response = await handler(request, context)

    expect(response.status).toBe(403)
    expect(reportMock).not.toHaveBeenCalled()
  })
})
