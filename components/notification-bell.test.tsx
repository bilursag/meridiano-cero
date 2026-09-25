import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

vi.mock('@/lib/notifications-context', () => ({ useOptionalNotifications: vi.fn() }))

const { useOptionalNotifications } = await import('@/lib/notifications-context')
const { NotificationBell } = await import('./notification-bell')
const useNotificationsMock = vi.mocked(useOptionalNotifications)

const alert = {
  id: 'n-1',
  type: 'TRIP_ALERT' as const,
  title: 'Alerta en Bariloche 4°B',
  body: 'Ana: Alumno con fiebre',
  tripId: 'trip-1',
  createdAt: '2026-09-24T12:00:00.000Z',
}

describe('NotificationBell', () => {
  it('renders nothing outside the admin panel (no provider)', () => {
    useNotificationsMock.mockReturnValue(null)
    const { container } = render(<NotificationBell />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the unread count and marks everything seen when opened', () => {
    const markAllSeen = vi.fn()
    useNotificationsMock.mockReturnValue({
      notifications: [alert],
      unreadCount: 1,
      seenAt: '2026-09-24T00:00:00.000Z',
      markAllSeen,
    })

    render(<NotificationBell />)
    const trigger = screen.getByRole('button', { name: 'Notificaciones, 1 sin leer' })
    fireEvent.click(trigger)

    expect(markAllSeen).toHaveBeenCalledOnce()
    expect(screen.getByText('Alerta en Bariloche 4°B')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/admin/trips/trip-1')
    expect(screen.getByLabelText('Nueva')).toBeInTheDocument()
  })

  it('does not call the API again when there is nothing unread', () => {
    const markAllSeen = vi.fn()
    useNotificationsMock.mockReturnValue({ notifications: [], unreadCount: 0, seenAt: null, markAllSeen })

    render(<NotificationBell />)
    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }))

    expect(markAllSeen).not.toHaveBeenCalled()
    expect(screen.getByText('Sin notificaciones')).toBeInTheDocument()
  })
})
