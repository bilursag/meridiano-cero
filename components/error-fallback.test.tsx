import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ErrorFallback } from './error-fallback'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(new Response('{}'))
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('ErrorFallback', () => {
  it('reports a client-side crash with the current path', () => {
    render(<ErrorFallback error={new Error('Cannot read properties of undefined')} onRetry={() => {}} />)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/v1/errors')
    expect(JSON.parse(init.body)).toEqual({ message: 'Cannot read properties of undefined', path: '/' })
  })

  it('does not report server errors again (they carry a digest and were reported on the server)', () => {
    const error = Object.assign(new Error('An error occurred in the Server Components render.'), { digest: '42' })
    render(<ErrorFallback error={error} onRetry={() => {}} />)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('retries when asked', () => {
    const onRetry = vi.fn()
    render(<ErrorFallback error={new Error('boom')} onRetry={onRetry} />)

    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }))

    expect(onRetry).toHaveBeenCalled()
  })
})
