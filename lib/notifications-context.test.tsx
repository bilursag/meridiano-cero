import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'

// Stable across renders, like the real App Router instance.
const router = { push: vi.fn() }
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

const { toast } = await import('sonner')
const { NotificationsProvider, useOptionalNotifications } = await import('./notifications-context')
const toastErrorMock = vi.mocked(toast.error)

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
}

function feed(notifications: unknown[], unreadCount = 0) {
  return jsonResponse({ notifications, unreadCount, seenAt: '2026-09-24T00:00:00.000Z' })
}

const alert = {
  id: 'n-1',
  type: 'TRIP_ALERT',
  title: 'Alerta en Pucón',
  body: 'Ana: Alumno con malestar',
  tripId: 'trip-1',
  createdAt: '2026-09-25T12:00:00.000Z',
}

function UnreadCount() {
  return <span data-testid="unread">{useOptionalNotifications()?.unreadCount}</span>
}

async function flushInitialLoad() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  toastErrorMock.mockReset()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('NotificationsProvider', () => {
  it('ignores a non-JSON response (lapsed session redirected to sign-in) instead of throwing', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('<!DOCTYPE html><html></html>', { headers: { 'content-type': 'text/html' } })
    )
    vi.stubGlobal('fetch', fetchMock)

    render(
      <NotificationsProvider>
        <UnreadCount />
      </NotificationsProvider>
    )
    await flushInitialLoad()

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(screen.getByTestId('unread')).toHaveTextContent('0')
  })

  it('does not toast alerts that already existed on first load, but toasts new ones on the next poll', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(feed([{ ...alert, id: 'n-old' }], 1))
      .mockResolvedValueOnce(feed([alert, { ...alert, id: 'n-old' }], 2))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')

    render(
      <NotificationsProvider>
        <UnreadCount />
      </NotificationsProvider>
    )
    await flushInitialLoad()
    expect(toastErrorMock).not.toHaveBeenCalled()
    expect(screen.getByTestId('unread')).toHaveTextContent('1')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })

    expect(toastErrorMock).toHaveBeenCalledOnce()
    expect(toastErrorMock).toHaveBeenCalledWith('Alerta en Pucón', expect.objectContaining({ description: 'Ana: Alumno con malestar' }))
    expect(screen.getByTestId('unread')).toHaveTextContent('2')
  })
})
