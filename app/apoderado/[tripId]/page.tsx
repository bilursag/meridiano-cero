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

export default function ApoderadoHome() {
  const { trip, itinerary, announcements, location } = useTripContext()
  if (!trip) return <div className="p-8 text-center text-muted-foreground">Gira no encontrada.</div>

  const currentActivity = itinerary.find((i) => i.status === 'en-curso')
  const nextActivity = itinerary.find((i) => i.status === 'pendiente')
  const highlighted = currentActivity ?? nextActivity
  const latestAnnouncement = announcements[0]

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Trip header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{trip.school}</p>
          <h1 className="text-2xl font-bold tracking-tight">{trip.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={trip.status} />
          <span className="text-sm text-muted-foreground">
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
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Navigation size={15} className="text-primary" />
              Ubicación en vivo
            </CardTitle>
            {location && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock size={11} />
                {timeAgo(location.updatedAt)}
              </span>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {location ? (
              <Link href={`/apoderado/${trip.id}/mapa`} className="block">
                <MapView lat={location.lat} lng={location.lng} height="300px" zoom={13} label={trip.name} />
                <div className="px-4 py-2.5 flex items-center justify-between text-xs text-muted-foreground border-t">
                  <span className="flex items-center gap-1.5">
                    <MapPin size={11} className="text-primary" />
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)} · ~{location.accuracy} m
                  </span>
                  <span className="text-primary font-medium flex items-center gap-1">
                    Ver mapa completo <ChevronRight size={12} />
                  </span>
                </div>
              </Link>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Sin señal GPS
              </div>
            )}
          </CardContent>
        </Card>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Current / next activity */}
          {highlighted && (
            <Link href={`/apoderado/${trip.id}/itinerario`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${currentActivity ? 'icon-blue' : 'bg-secondary'}`}>
                      <Calendar size={16} className={currentActivity ? '' : 'text-muted-foreground'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                        {currentActivity ? 'Actividad actual' : 'Próxima actividad'}
                      </p>
                      <p className="font-semibold text-sm leading-snug">{highlighted.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin size={10} /> {highlighted.location}
                      </p>
                      <p className="text-xs font-semibold text-primary mt-1">{highlighted.time}</p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground shrink-0 self-center" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Latest announcement */}
          {latestAnnouncement && (
            <Link href={`/apoderado/${trip.id}/comunicados`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg icon-amber flex items-center justify-center shrink-0">
                      <Bell size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                        Último comunicado
                      </p>
                      <p className="font-semibold text-sm leading-snug">{latestAnnouncement.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {latestAnnouncement.message}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground shrink-0 self-center" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Alumnos', value: String(trip.studentCount) },
              { label: 'Monitor', value: trip.monitor.split(' ').slice(-1)[0] },
              { label: 'Destino', value: 'Bariloche' },
            ].map(({ label, value }) => (
              <Card key={label}>
                <CardContent className="p-3 text-center">
                  <p className="font-bold text-sm">{value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
