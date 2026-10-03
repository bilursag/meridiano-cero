import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

vi.mock('@/lib/notifications-context', () => ({ useOptionalNotifications: vi.fn() }))
vi.mock('@/components/site-header', () => ({ SiteHeader: ({ title }: { title: string }) => <h1>{title}</h1> }))

const { useOptionalNotifications } = await import('@/lib/notifications-context')
const { default: AdminNotificationsPage } = await import('./page')
const useNotificationsMock = vi.mocked(useOptionalNotifications)

const markAllSeen = vi.fn()
const fetchMock = vi.fn()

function notification(id: string, createdAt: string, overrides = {}) {
  return { id, type: 'TRIP_ALERT', title: `Alerta ${id}`, body: 'Ana: fiebre', tripId: 'trip-1', createdAt, ...overrides }
}

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } })
}

beforeEach(() => {
  markAllSeen.mockReset()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  useNotificationsMock.mockReturnValue({ notifications: [], unreadCount: 0, seenAt: null, markAllSeen })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AdminNotificationsPage', () => {
  it('highlights what was new on arrival, marks it seen and links each item to its destination', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        notifications: [
          notification('new', '2026-09-28T15:00:00.000Z'),
          notification('old', '2026-09-20T10:00:00.000Z', { type: 'SYSTEM_ERROR', tripId: null, title: 'Error en el servidor' }),
        ],
        nextCursor: null,
        seenAt: '2026-09-27T00:00:00.000Z',
      })
    )

    render(<AdminNotificationsPage />)

    expect(await screen.findByText('Alerta new')).toBeInTheDocument()
    expect(markAllSeen).toHaveBeenCalledOnce()
    expect(screen.getAllByLabelText('Nueva')).toHaveLength(1)
    expect(screen.getByRole('link', { name: /Alerta new/ })).toHaveAttribute('href', '/admin/trips/trip-1?tab=comunicados')
    // System errors aren't tied to a trip, so they render without a link.
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Cargar más' })).not.toBeInTheDocument()
  })

  it('does not mark anything seen when nothing is new', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ notifications: [notification('a', '2026-09-20T10:00:00.000Z')], nextCursor: null, seenAt: '2026-09-27T00:00:00.000Z' })
    )

    render(<AdminNotificationsPage />)

    expect(await screen.findByText('Alerta a')).toBeInTheDocument()
    expect(markAllSeen).not.toHaveBeenCalled()
  })

  it('loads the next page with the cursor and appends it', async () => {
    const seenAt = '2026-09-27T00:00:00.000Z'
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ notifications: [notification('a', '2026-09-20T10:00:00.000Z')], nextCursor: 'a', seenAt }))
      .mockResolvedValueOnce(jsonResponse({ notifications: [notification('b', '2026-09-19T10:00:00.000Z')], nextCursor: null, seenAt }))

    render(<AdminNotificationsPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Cargar más' }))

    expect(await screen.findByText('Alerta b')).toBeInTheDocument()
    expect(screen.getByText('Alerta a')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/admin/notifications/history?cursor=a')
    expect(screen.queryByRole('button', { name: 'Cargar más' })).not.toBeInTheDocument()
  })

  it('shows a retry when the history cannot be loaded', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } }))

    render(<AdminNotificationsPage />)

    expect(await screen.findByText('No se pudieron cargar las notificaciones.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()
  })
})
