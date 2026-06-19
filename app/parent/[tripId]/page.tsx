'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Clock, ChevronRight, Calendar, Bell, Navigation, MapPin } from 'lucide-react'
import { useTripContext } from '@/lib/trip-context'
import StatusBadge from '@/components/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return 'ahora mismo'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  return `hace ${Math.floor(diff / 3600)} h`
}

export default function ParentHome() {
  const { trip, itinerary, announcements, location } = useTripContext()
  if (!trip) return <div className="p-8 text-center text-muted-foreground">Gira no encontrada.</div>

  const currentActivity = itinerary.find((i) => i.status === 'IN_PROGRESS')
  const nextActivity = itinerary.find((i) => i.status === 'PENDING')
  const highlighted = currentActivity ?? nextActivity
  const latestAnnouncement = announcements[0]

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Trip header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{trip.school.name}</p>
          <h1 className="text-3xl font-bold tracking-tight">{trip.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={trip.status} />
          <span className="text-base text-muted-foreground">
            Día {trip.currentDay} de {trip.totalDays}
          </span>
        </div>
      </div>

      <Separator />

      {/* Main grid: map + side panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map card — takes 2/3 on large screens */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Navigation size={18} className="text-primary" />
              Dónde está ahora
            </CardTitle>
            {location && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock size={13} />
                {timeAgo(location.updatedAt)}
              </span>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {location ? (
              <Link href={`/parent/${trip.id}/map`} className="block">
                <MapView lat={location.lat} lng={location.lng} height="300px" zoom={13} label={trip.name} />
                <div className="px-4 py-3 flex items-center justify-between text-sm text-muted-foreground border-t">
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-primary" />
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)} · ~{location.accuracy} m
                  </span>
                  <span className="text-primary font-semibold flex items-center gap-1">
                    Ver mapa completo <ChevronRight size={14} />
                  </span>
                </div>
              </Link>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-base">
                Sin señal GPS
              </div>
            )}
          </CardContent>
        </Card>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Current / next activity */}
          {highlighted && (
            <Link href={`/parent/${trip.id}/itinerary`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${currentActivity ? 'icon-blue' : 'bg-secondary'}`}>
                      <Calendar size={20} className={currentActivity ? '' : 'text-muted-foreground'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide mb-1">
                        {currentActivity ? 'Actividad actual' : 'Próxima actividad'}
                      </p>
                      <p className="font-semibold text-base leading-snug">{highlighted.title}</p>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin size={13} /> {highlighted.location}
                      </p>
                      <p className="text-sm font-semibold text-primary mt-1">{highlighted.time}</p>
                    </div>
                    <ChevronRight size={20} className="text-muted-foreground shrink-0 self-center" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Latest announcement */}
          {latestAnnouncement && (
            <Link href={`/parent/${trip.id}/announcements`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-lg icon-amber flex items-center justify-center shrink-0">
                      <Bell size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide mb-1">
                        Último comunicado
                      </p>
                      <p className="font-semibold text-base leading-snug">{latestAnnouncement.title}</p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {latestAnnouncement.message}
                      </p>
                    </div>
                    <ChevronRight size={20} className="text-muted-foreground shrink-0 self-center" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Alumnos', value: String(trip.studentCount) },
              { label: 'Día', value: `${trip.currentDay}/${trip.totalDays}` },
              { label: 'Destino', value: trip.destination },
            ].map(({ label, value }) => (
              <Card key={label}>
                <CardContent className="p-3 text-center">
                  <p className="font-bold text-base">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
