'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowRightIcon } from 'lucide-react'
import type { TripStatus } from '@prisma/client'
import { SiteHeader } from '@/components/site-header'
import { SectionCards } from '@/components/section-cards'
import { type TripRow } from '@/components/data-table'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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

export default function AdminPage() {
  const [trips, setTrips] = useState<TripRow[]>([])
  const [fleet, setFleet] = useState<FleetTrip[] | null>(null)
  const [search, setSearch] = useState('')
  const [schoolFilter, setSchoolFilter] = useState<string[]>([])
  const [destinationFilter, setDestinationFilter] = useState<string[]>([])
  const [monitorFilter, setMonitorFilter] = useState<string[]>([])
  const [executiveFilter, setExecutiveFilter] = useState<string[]>([])

  useEffect(() => {
    const id = window.setTimeout(async () => {
      const res = await fetch('/api/v1/trips')
      if (res.ok) setTrips((await res.json()).trips)
    }, 0)

    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    const id = window.setTimeout(async () => {
      const res = await fetch('/api/v1/admin/map')
      if (res.ok) setFleet((await res.json()).fleet)
    }, 0)

    return () => window.clearTimeout(id)
  }, [])

  const schoolOptions = useMemo(() => Array.from(new Set(trips.map((t) => t.school.name))).sort(), [trips])
  const destinationOptions = useMemo(() => Array.from(new Set(trips.map((t) => t.destination))).sort(), [trips])
  const monitorOptions = useMemo(
    () => Array.from(new Set(trips.flatMap((t) => t.monitorNames))).sort(),
    [trips]
  )
  const executiveOptions = useMemo(
    () => Array.from(new Set(trips.map((t) => t.salesExecutive).filter((v): v is string => !!v))).sort(),
    [trips]
  )
  const matchesFilters = useCallback(
    (name: string, school: string, destination: string, monitorNames: string[], salesExecutive: string | null) => {
      const query = search.trim().toLowerCase()
      const matchesSearch = !query || name.toLowerCase().includes(query) || destination.toLowerCase().includes(query)
      const matchesSchool = schoolFilter.length === 0 || schoolFilter.includes(school)
      const matchesDestination = destinationFilter.length === 0 || destinationFilter.includes(destination)
      const matchesMonitor = monitorFilter.length === 0 || monitorNames.some((name) => monitorFilter.includes(name))
      const matchesExecutive = executiveFilter.length === 0 || (!!salesExecutive && executiveFilter.includes(salesExecutive))
      return matchesSearch && matchesSchool && matchesDestination && matchesMonitor && matchesExecutive
    },
    [search, schoolFilter, destinationFilter, monitorFilter, executiveFilter]
  )

  const filteredTrips = useMemo(
    () =>
      trips.filter((trip) =>
        matchesFilters(trip.name, trip.school.name, trip.destination, trip.monitorNames, trip.salesExecutive)
      ),
    [trips, matchesFilters]
  )
  const recentTrips = filteredTrips.slice(0, 5)

  const activeTripCount = filteredTrips.filter((t) => t.status !== 'FINISHED').length
  const codeCount = filteredTrips.reduce((sum, t) => sum + t.accessCodes.length, 0)
  const monitorCount = filteredTrips.reduce(
    (sum, t) => sum + t.accessCodes.filter((code) => code.role === 'MONITOR').length,
    0
  )

  const totalStudentsMale = filteredTrips.reduce((sum, t) => sum + (t.studentCountMale ?? 0), 0)
  const totalStudentsFemale = filteredTrips.reduce((sum, t) => sum + (t.studentCountFemale ?? 0), 0)
  const totalCompanionsMale = filteredTrips.reduce((sum, t) => sum + (t.companionCountMale ?? 0), 0)
  const totalCompanionsFemale = filteredTrips.reduce((sum, t) => sum + (t.companionCountFemale ?? 0), 0)
  const totalPassengers = totalStudentsMale + totalStudentsFemale + totalCompanionsMale + totalCompanionsFemale

  const filteredFleet = useMemo(
    () =>
      (fleet ?? []).filter((trip) =>
        matchesFilters(trip.name, trip.school, trip.destination, trip.monitorNames, trip.salesExecutive)
      ),
    [fleet, matchesFilters]
  )

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
      <SiteHeader title="Dashboard" subtitle="Administración de grupos" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <SectionCards
              activeTripCount={activeTripCount}
              codeCount={codeCount}
              monitorCount={monitorCount}
            />
            <div className="px-4 lg:px-6">
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
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-4 lg:px-6">
              <StatChip label="Total pasajeros" value={totalPassengers} />
              <StatChip
                label="Alumnos"
                value={totalStudentsMale + totalStudentsFemale}
                detail={`${totalStudentsMale} H · ${totalStudentsFemale} M`}
              />
              <StatChip
                label="Acompañantes"
                value={totalCompanionsMale + totalCompanionsFemale}
                detail={`${totalCompanionsMale} H · ${totalCompanionsFemale} M`}
              />
              <StatChip label="Grupos filtrados" value={filteredTrips.length} />
            </div>
            <div className="px-4 lg:px-6">
              <Card className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Mapa operativo</CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/admin/map">
                      Ver mapa completo
                      <ArrowRightIcon />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {markers.length ? (
                    <FleetMapView markers={markers} height="380px" />
                  ) : (
                    <div className="flex h-95 items-center justify-center rounded-lg border text-muted-foreground">
                      {fleet && fleet.length > 0 ? 'Sin grupos que coincidan con el filtro.' : 'Sin grupos en terreno actualmente.'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Grupos recientes</CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/admin/trips">
                      Ver todos
                      <ArrowRightIcon />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Colegio</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>In-Out</TableHead>
                        <TableHead>Actividad actual</TableHead>
                        <TableHead>Coordinador</TableHead>
                        <TableHead>Ejecutivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentTrips.length ? (
                        recentTrips.map((trip) => {
                          const currentActivity = trip.itineraryItems.find((item) => item.status !== 'COMPLETED')
                          return (
                            <TableRow key={trip.id}>
                              <TableCell>
                                <Link href={`/admin/trips/${trip.id}`} className="font-medium hover:underline">
                                  {trip.name}
                                </Link>
                              </TableCell>
                              <TableCell>{trip.school.name}</TableCell>
                              <TableCell>
                                <StatusBadge status={trip.status} />
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {format(new Date(trip.startDate), 'd MMM', { locale: es })}–
                                {format(new Date(trip.endDate), 'd MMM', { locale: es })}
                              </TableCell>
                              <TableCell className="text-muted-foreground">{currentActivity?.title ?? '—'}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {trip.monitorNames.join(', ') || '—'}
                              </TableCell>
                              <TableCell className="text-muted-foreground">{trip.salesExecutive || '—'}</TableCell>
                            </TableRow>
                          )
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            Sin grupos todavía.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function StatChip({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  )
}
