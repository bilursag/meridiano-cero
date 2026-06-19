'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { Home, MapPin, CalendarDays, Bell } from 'lucide-react'
import { useTripContext } from '@/lib/trip-context'

const tabs = [
  { label: 'Inicio', suffix: '', Icon: Home },
  { label: 'Mapa', suffix: '/map', Icon: MapPin },
  { label: 'Itinerario', suffix: '/itinerary', Icon: CalendarDays },
  { label: 'Comunicados', suffix: '/announcements', Icon: Bell },
]

export default function BottomNav() {
  const pathname = usePathname()
  const params = useParams()
  const tripId = params?.tripId as string
  const { unreadCount } = useTripContext()
  const base = `/parent/${tripId}`

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
      <div className="flex max-w-lg mx-auto">
        {tabs.map(({ label, suffix, Icon }) => {
          const href = `${base}${suffix}`
          const active = suffix === '' ? pathname === base : pathname.startsWith(href)
          return (
            <Link
              key={label}
              href={href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors relative
                ${active ? 'text-blue-700' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              <span>{label}</span>
              {label === 'Comunicados' && unreadCount > 0 && (
                <span className="absolute top-1.5 right-[calc(50%-18px)] min-w-4 h-4 px-1 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold leading-none">
                  {unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
