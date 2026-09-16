'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { DownloadIcon, FileTextIcon } from 'lucide-react'
import type { Announcement, AnnouncementType } from '@prisma/client'
import type { DateRange } from 'react-day-picker'
import { SiteHeader } from '@/components/site-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/empty-state'
import { FetchError } from '@/components/fetch-error'
import { GlobalFilters } from '@/components/global-filters'
import { announcementTypeLabels } from '@/lib/labels'
import type { TripRow } from '@/components/data-table'

type ReportRow = Announcement & { trip: { id: string; name: string; school: { name: string } } }

const TYPE_BADGE_VARIANT: Record<AnnouncementType, 'destructive' | 'secondary' | 'outline'> = {
  ALERT: 'destructive',
  ACHIEVEMENT: 'secondary',
  INFO: 'outline',
}

function downloadCsv(trips: TripRow[]) {
  const header = ['Nombre', 'Colegio', 'Destino', 'Ejecutivo', 'Estado', 'Día', 'Alumnos', 'Inicio', 'Término']
  const rows = trips.map((trip) => [
    trip.name,
    trip.school.name,
    trip.destination,
    trip.salesExecutive ?? '',
    trip.status,
    `${trip.currentDay}/${trip.totalDays}`,
    trip.studentCount,
    new Date(trip.startDate).toLocaleDateString('es-CL'),
    new Date(trip.endDate).toLocaleDateString('es-CL'),
  ])
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `grupos-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportRow[] | null>(null)
  const [trips, setTrips] = useState<TripRow[]>([])
  const [typeFilter, setTypeFilter] = useState<AnnouncementType | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [schoolFilter, setSchoolFilter] = useState<string[]>([])
  const [destinationFilter, setDestinationFilter] = useState<string[]>([])
  const [monitorFilter, setMonitorFilter] = useState<string[]>([])
  const [executiveFilter, setExecutiveFilter] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const [reportsRes, tripsRes] = await Promise.all([
      fetch('/api/v1/admin/reports'),
      fetch('/api/v1/trips'),
    ])
    if (reportsRes.ok) {
      setReports((await reportsRes.json()).announcements)
    } else {
      const data = await reportsRes.json().catch(() => null)
      setError(data?.error?.message ?? 'No se pudieron cargar los reportes.')
    }
    if (tripsRes.ok) setTrips((await tripsRes.json()).trips)
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(id)
  }, [load])

  const schoolOptions = useMemo(
    () => Array.from(new Set(trips.map((trip) => trip.school.name))).sort(),
    [trips]
  )
  const destinationOptions = useMemo(
    () => Array.from(new Set(trips.map((trip) => trip.destination))).sort(),
    [trips]
  )
  const monitorOptions = useMemo(
    () => Array.from(new Set(trips.flatMap((trip) => trip.monitorNames))).sort(),
    [trips]
  )
  const executiveOptions = useMemo(
    () => Array.from(new Set(trips.map((trip) => trip.salesExecutive).filter((v): v is string => !!v))).sort(),
    [trips]
  )

  const matchingTripIds = useMemo(() => {
    const query = search.trim().toLowerCase()
    return new Set(
      trips
        .filter((trip) => {
          const matchesSearch = !query || trip.name.toLowerCase().includes(query)
          const matchesSchool = schoolFilter.length === 0 || schoolFilter.includes(trip.school.name)
          const matchesDestination = destinationFilter.length === 0 || destinationFilter.includes(trip.destination)
          const matchesMonitor =
            monitorFilter.length === 0 || trip.monitorNames.some((name) => monitorFilter.includes(name))
          const matchesExecutive =
            executiveFilter.length === 0 || (!!trip.salesExecutive && executiveFilter.includes(trip.salesExecutive))
          return matchesSearch && matchesSchool && matchesDestination && matchesMonitor && matchesExecutive
        })
        .map((trip) => trip.id)
    )
  }, [trips, search, schoolFilter, destinationFilter, monitorFilter, executiveFilter])

  const filtered = useMemo(
    () =>
      (reports ?? []).filter((report) => {
        const matchesType = typeFilter === 'ALL' || report.type === typeFilter
        const matchesTrip = matchingTripIds.has(report.trip.id)
        let matchesDate = true
        if (dateRange?.from && dateRange?.to) {
          const createdAt = new Date(report.createdAt)
          const endOfDay = new Date(dateRange.to)
          endOfDay.setHours(23, 59, 59, 999)
          matchesDate = createdAt >= dateRange.from && createdAt <= endOfDay
        }
        return matchesType && matchesTrip && matchesDate
      }),
    [reports, typeFilter, matchingTripIds, dateRange]
  )

  return (
    <>
      <SiteHeader
        title="Reportes"
        subtitle="Alertas y logros reportados en terreno"
        right={
          <Button variant="outline" size="xs" onClick={() => downloadCsv(trips)} disabled={!trips.length}>
            <DownloadIcon />
            Exportar grupos (CSV)
          </Button>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as AnnouncementType | 'ALL')}>
            <SelectTrigger className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los tipos</SelectItem>
              <SelectItem value="ALERT">Alertas</SelectItem>
              <SelectItem value="ACHIEVEMENT">Logros</SelectItem>
            </SelectContent>
          </Select>
          <GlobalFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar grupo…"
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
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>

        <Card className="overflow-hidden">
          {error && !reports ? (
            <FetchError message={error} onRetry={load} />
          ) : !reports ? (
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length ? (
                  filtered.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <Badge variant={TYPE_BADGE_VARIANT[report.type]}>
                          {announcementTypeLabels[report.type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{report.title}</TableCell>
                      <TableCell>
                        {report.trip.name} · {report.trip.school.name}
                      </TableCell>
                      <TableCell>{report.authorName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(report.createdAt).toLocaleString('es-CL')}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <EmptyState
                        icon={FileTextIcon}
                        title="Sin reportes para este filtro."
                        description="Prueba con otro tipo o colegio."
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  )
}
