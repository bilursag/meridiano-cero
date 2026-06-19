'use client'

import dynamic from 'next/dynamic'
import { Clock, MapPin, Signal } from 'lucide-react'
import { useTripContext } from '@/lib/trip-context'
import StatusBadge from '@/components/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return 'ahora mismo'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  return `hace ${Math.floor(diff / 3600)} h`
}

export default function MapPage() {
  const { trip, location } = useTripContext()
  if (!trip) return null

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mapa en vivo</h1>
          <p className="text-base text-muted-foreground mt-0.5">{trip.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={trip.status} />
          <span className="flex items-center gap-1.5 text-base text-success font-semibold">
            <Signal size={17} />
            En línea
          </span>
        </div>
      </div>

      {/* Map */}
      <Card className="overflow-hidden">
        {location ? (
          <>
            <MapView
              lat={location.lat}
              lng={location.lng}
              height="calc(100vh - 260px)"
              zoom={14}
              label={trip.name}
            />
            {/* Info bar */}
            <CardContent className="py-3 px-4 flex items-center justify-between border-t">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-primary" />
                  {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </span>
                <span>Precisión: ~{location.accuracy} m</span>
              </div>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock size={13} />
                {timeAgo(location.updatedAt)}
              </span>
            </CardContent>
          </>
        ) : (
          <CardContent className="h-96 flex items-center justify-center text-muted-foreground">
            Sin ubicación disponible
          </CardContent>
        )}
      </Card>
    </div>
  )
}
