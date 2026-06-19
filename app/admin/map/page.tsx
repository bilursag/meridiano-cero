'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { TripStatus } from '@prisma/client'
import { SiteHeader } from '@/components/site-header'
import StatusBadge from '@/components/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { FleetMarker } from '@/components/FleetMapView'

const FleetMapView = dynamic(() => import('@/components/FleetMapView'), { ssr: false })

type FleetTrip = {
  id: string
  name: string
  destination: string
  status: TripStatus
  school: string
  ping: { lat: number; lng: number; createdAt: string } | null
  initialLat: number
  initialLng: number
}

const STATUS_COLOR: Record<TripStatus, string> = {
  IN_TRANSIT: '#f59e0b',
  IN_ACTIVITY: '#3b82f6',
  RESTING: '#22c55e',
  EMERGENCY: '#ef4444',
  FINISHED: '#94a3b8',
}

export default function AdminMapPage() {
  const [fleet, setFleet] = useState<FleetTrip[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/v1/admin/map')
      if (res.ok) setFleet((await res.json()).fleet)
    })()
  }, [])

  if (!fleet) {
    return (
      <>
        <SiteHeader title="Mapa operativo" subtitle="Giras en terreno en tiempo real" />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
          <Skeleton className="h-[calc(100vh-180px)] w-full" />
        </div>
      </>
    )
  }

  const markers: FleetMarker[] = fleet.map((trip) => ({
    id: trip.id,
    lat: trip.ping?.lat ?? trip.initialLat,
    lng: trip.ping?.lng ?? trip.initialLng,
    label: trip.name,
    sublabel: trip.destination,
    color: STATUS_COLOR[trip.status],
  }))

  return (
    <>
      <SiteHeader title="Mapa operativo" subtitle="Giras en terreno en tiempo real" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <Card className="overflow-hidden">
            {markers.length ? (
              <FleetMapView
                markers={markers}
                selectedId={selectedId}
                onMarkerClick={setSelectedId}
                height="calc(100vh - 180px)"
              />
            ) : (
              <CardContent className="flex h-[calc(100vh-180px)] items-center justify-center text-muted-foreground">
                Sin giras en terreno actualmente.
              </CardContent>
            )}
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="flex h-[calc(100vh-180px)] flex-col gap-1 overflow-y-auto p-2">
              {fleet.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => setSelectedId(trip.id)}
                  className={`flex flex-col gap-1 rounded-md p-3 text-left transition-colors hover:bg-muted ${selectedId === trip.id ? 'bg-muted' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{trip.name}</span>
                    <StatusBadge status={trip.status} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {trip.school} · {trip.destination}
                  </span>
                  {trip.ping ? (
                    <span className="text-xs text-muted-foreground">
                      Última señal {new Date(trip.ping.createdAt).toLocaleTimeString('es-CL')}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin señal reciente</span>
                  )}
                </button>
              ))}
              {fleet.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">Sin giras en terreno actualmente.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
