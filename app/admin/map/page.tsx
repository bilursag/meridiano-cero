'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import type { TripStatus } from '@prisma/client'
import { MapPinIcon } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import StatusBadge from '@/components/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { FetchError } from '@/components/fetch-error'
import { GlobalFilters } from '@/components/global-filters'
import type { FleetMarker } from '@/components/FleetMapView'

const FleetMapView = dynamic(() => import('@/components/FleetMapView'), { ssr: false })

type FleetTrip = {
  id: string
  name: string
  destination: string
  status: TripStatus
  school: string
  salesExecutive: string | null
  ping: { lat: number; lng: number; createdAt: string } | null
  initialLat: number
  initialLng: number
  monitorNames: string[]
}

const STATUS_COLOR: Record<TripStatus, string> = {
  IN_TRANSIT: '#f59e0b',
  IN_ACTIVITY: '#3b82f6',
  RESTING: '#22c55e',
  FINISHED: '#94a3b8',
}

export default function AdminMapPage() {
  const [fleet, setFleet] = useState<FleetTrip[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [schoolFilter, setSchoolFilter] = useState<string[]>([])
  const [destinationFilter, setDestinationFilter] = useState<string[]>([])
  const [monitorFilter, setMonitorFilter] = useState<string[]>([])
  const [executiveFilter, setExecutiveFilter] = useState<string[]>([])

  const load = useCallback(async () => {
    setError(null)
    const res = await fetch('/api/v1/admin/map')
    if (res.ok) {
      setFleet((await res.json()).fleet)
    } else {
      const data = await res.json().catch(() => null)
      setError(data?.error?.message ?? 'No se pudo cargar el mapa.')
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(id)
  }, [load])

  const schoolOptions = useMemo(
    () => Array.from(new Set((fleet ?? []).map((trip) => trip.school))).sort(),
    [fleet]
  )
  const destinationOptions = useMemo(
    () => Array.from(new Set((fleet ?? []).map((trip) => trip.destination))).sort(),
    [fleet]
  )
  const monitorOptions = useMemo(
    () => Array.from(new Set((fleet ?? []).flatMap((trip) => trip.monitorNames))).sort(),
    [fleet]
  )
  const executiveOptions = useMemo(
    () => Array.from(new Set((fleet ?? []).map((trip) => trip.salesExecutive).filter((v): v is string => !!v))).sort(),
    [fleet]
  )

  const filteredFleet = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (fleet ?? []).filter((trip) => {
      const matchesSearch =
        !query || trip.name.toLowerCase().includes(query) || trip.destination.toLowerCase().includes(query)
      const matchesSchool = schoolFilter.length === 0 || schoolFilter.includes(trip.school)
      const matchesDestination = destinationFilter.length === 0 || destinationFilter.includes(trip.destination)
      const matchesMonitor =
        monitorFilter.length === 0 || trip.monitorNames.some((name) => monitorFilter.includes(name))
      const matchesExecutive = executiveFilter.length === 0 || (!!trip.salesExecutive && executiveFilter.includes(trip.salesExecutive))
      return matchesSearch && matchesSchool && matchesDestination && matchesMonitor && matchesExecutive
    })
  }, [fleet, search, schoolFilter, destinationFilter, monitorFilter, executiveFilter])

  if (error && !fleet) {
    return (
      <>
        <SiteHeader title="Mapa operativo" subtitle="Grupos en terreno en tiempo real" />
        <FetchError message={error} onRetry={load} />
      </>
    )
  }

  if (!fleet) {
    return (
      <>
        <SiteHeader title="Mapa operativo" subtitle="Grupos en terreno en tiempo real" />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
          <Skeleton className="h-[calc(100vh-180px)] w-full" />
        </div>
      </>
    )
  }

  const markers: FleetMarker[] = filteredFleet.map((trip) => ({
    id: trip.id,
    lat: trip.ping?.lat ?? trip.initialLat,
    lng: trip.ping?.lng ?? trip.initialLng,
    label: trip.name,
    sublabel: trip.destination,
    color: STATUS_COLOR[trip.status],
  }))

  return (
    <>
      <SiteHeader title="Mapa operativo" subtitle="Grupos en terreno en tiempo real" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <GlobalFilters
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar grupo o destino…"
          schoolOptions={schoolOptions}
          schoolFilter={schoolFilter}
          onSchoolFilterChange={setSchoolFilter}
          destinationOptions={destinationOptions}
          destinationFilter={destinationFilter}
          onDestinationFilterChange={setDestinationFilter}
          monitorOptions={monitorOptions}
          monitorFilter={monitorFilter}
          onMonitorFilterChange={setMonitorFilter}
          executiveOptions={executiveOptions}
          executiveFilter={executiveFilter}
          onExecutiveFilterChange={setExecutiveFilter}
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <Card className="overflow-hidden">
            {markers.length ? (
              <FleetMapView
                markers={markers}
                selectedId={selectedId}
                onMarkerClick={setSelectedId}
                height="calc(100vh - 232px)"
              />
            ) : (
              <CardContent className="flex h-[calc(100vh-232px)] items-center justify-center">
                <EmptyState
                  icon={MapPinIcon}
                  title={fleet.length > 0 ? 'Sin grupos que coincidan con el filtro.' : 'Sin grupos en terreno actualmente.'}
                  description={fleet.length > 0 ? 'Prueba con otros filtros.' : undefined}
                />
              </CardContent>
            )}
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="flex h-[calc(100vh-232px)] flex-col gap-1 overflow-y-auto p-2">
              {filteredFleet.map((trip) => (
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
              {filteredFleet.length === 0 ? (
                <EmptyState
                  icon={MapPinIcon}
                  title={fleet.length > 0 ? 'Sin grupos que coincidan con el filtro.' : 'Sin grupos en terreno actualmente.'}
                  description={fleet.length > 0 ? 'Prueba con otros filtros.' : undefined}
                />
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
