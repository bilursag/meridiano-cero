import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: { fullName: 'Francisco Muñoz', primaryEmailAddress: { emailAddress: 'f@example.com' } } }),
  useClerk: () => ({ signOut: vi.fn() }),
}))
vi.mock('@/components/ui/sidebar', () => ({
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  SidebarMenuButton: ({ children, ...props }: React.ComponentProps<'button'>) => (
    <button onKeyDown={props.onKeyDown} onPointerDown={props.onPointerDown} aria-expanded={props['aria-expanded']}>
      {children}
    </button>
  ),
  useSidebar: () => ({ isMobile: false }),
}))
vi.mock('@/lib/notifications-context', () => ({ useOptionalNotifications: vi.fn() }))
const setTheme = vi.fn()
vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'system', resolvedTheme: 'light', setTheme }) }))

const { useOptionalNotifications } = await import('@/lib/notifications-context')
const { NavUser } = await import('./nav-user')
const useNotificationsMock = vi.mocked(useOptionalNotifications)

afterEach(cleanup)

function openMenu() {
  fireEvent.keyDown(screen.getByRole('button', { name: /Francisco Muñoz/ }), { key: 'Enter' })
}

describe('NavUser', () => {
  it('links to the account settings and the notifications page, without billing', () => {
    useNotificationsMock.mockReturnValue({ notifications: [], unreadCount: 3, seenAt: null, markAllSeen: vi.fn() })
    render(<NavUser />)
    openMenu()

    expect(screen.getByRole('menuitem', { name: 'Cuenta' })).toHaveAttribute('href', '/admin/settings')
    expect(screen.getByRole('menuitem', { name: /Notificaciones/ })).toHaveAttribute('href', '/admin/notifications')
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.queryByText('Facturación')).not.toBeInTheDocument()
  })

  it('shows no badge when everything has been seen', () => {
    useNotificationsMock.mockReturnValue({ notifications: [], unreadCount: 0, seenAt: null, markAllSeen: vi.fn() })
    render(<NavUser />)
    openMenu()

    expect(screen.getByRole('menuitem', { name: 'Notificaciones' })).toBeInTheDocument()
  })

  it('switches the theme from the Tema submenu, marking the current choice', () => {
    useNotificationsMock.mockReturnValue(null)
    render(<NavUser />)
    openMenu()

    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Tema' }), { key: 'ArrowRight' })
    expect(screen.getByRole('menuitemradio', { name: 'Sistema' })).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Oscuro' }))
    expect(setTheme).toHaveBeenCalledWith('dark')
  })
})
