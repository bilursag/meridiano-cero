'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { SignOutButton } from '@clerk/nextjs'
import { MapPin, LogOut, Home, Map as MapIcon, CalendarDays, Bell } from 'lucide-react'
import { useTripContext } from '@/lib/trip-context'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import StatusBadge from '@/components/StatusBadge'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Inicio', suffix: '', Icon: Home },
  { label: 'Mapa', suffix: '/map', Icon: MapIcon },
  { label: 'Itinerario', suffix: '/itinerary', Icon: CalendarDays },
  { label: 'Comunicados', suffix: '/announcements', Icon: Bell },
]

export default function NavBar() {
  const pathname = usePathname()
  const params = useParams()
  const tripId = params?.tripId as string
  const { trip, unreadCount } = useTripContext()
  const base = `/parent/${tripId}`

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-2">
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
        <nav className="flex items-center gap-0.5 ml-auto md:ml-4 overflow-x-auto">
          {navItems.map(({ label, suffix, Icon }) => {
            const href = `${base}${suffix}`
            const active = suffix === '' ? pathname === base : pathname.startsWith(href)
            return (
              <Link
                key={label}
                href={href}
                className={cn(
                  'relative flex items-center shrink-0 gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-md text-xs sm:text-sm font-semibold transition-colors',
                  active
                    ? 'text-foreground bg-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
              >
                <Icon size={17} />
                <span>{label}</span>
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
          <SignOutButton redirectUrl="/sign-in">
            <Button variant="ghost" size="sm">
              <LogOut size={15} />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </SignOutButton>
        </div>
      </div>
    </header>
  )
}
