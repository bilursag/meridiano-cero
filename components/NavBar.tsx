'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { MapPin, LogOut, Home, Map as MapIcon, CalendarDays, Bell } from 'lucide-react'
import { useTripContext } from '@/lib/trip-context'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import StatusBadge from '@/components/StatusBadge'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Inicio', suffix: '', Icon: Home },
  { label: 'Mapa', suffix: '/mapa', Icon: MapIcon },
  { label: 'Itinerario', suffix: '/itinerario', Icon: CalendarDays },
  { label: 'Comunicados', suffix: '/comunicados', Icon: Bell },
]

export default function NavBar() {
  const pathname = usePathname()
  const params = useParams()
  const tripId = params?.tripId as string
  const { trip, unreadCount } = useTripContext()
  const base = `/apoderado/${tripId}`

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 mr-1">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <MapPin size={14} className="text-primary-foreground" />
          </div>
          <span className="font-bold text-sm hidden sm:inline">Meridiano Cero</span>
        </Link>

        {/* Divider + trip name — desktop only */}
        <div className="hidden md:flex items-center gap-2">
          <div className="h-4 w-px bg-border/40" />
          {trip && (
            <span className="text-xs text-muted-foreground truncate max-w-44">{trip.name}</span>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5 ml-auto md:ml-4">
          {navItems.map(({ label, suffix, Icon }) => {
            const href = `${base}${suffix}`
            const active = suffix === '' ? pathname === base : pathname.startsWith(href)
            return (
              <Link
                key={label}
                href={href}
                className={cn(
                  'relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors',
                  active
                    ? 'text-foreground bg-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{label}</span>
                {label === 'Comunicados' && unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Right: status + theme toggle + logout */}
        <div className="ml-auto flex items-center gap-1">
          {trip && <StatusBadge status={trip.status} />}
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">
              <LogOut size={15} />
              <span className="hidden sm:inline">Salir</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
