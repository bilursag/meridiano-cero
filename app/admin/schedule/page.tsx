'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { addDays, eachDayOfInterval, format, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { InfoIcon, LayoutGridIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { SiteHeader } from '@/components/site-header'
import { EmptyState } from '@/components/empty-state'
import { FetchError } from '@/components/fetch-error'
import { Card } from '@/components/ui/card'
import { GlobalFilters } from '@/components/global-filters'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'

type ScheduleTrip = {
  id: string
  name: string
  destination: string
  school: { name: string }
  salesExecutive: string | null
  program: { name: string }
  studentCount: number
  hotel: string | null
  startDate: string
  endDate: string
  currentDay: number
  totalDays: number
  itineraryItems: { dayNumber: number; time: string; title: string }[]
  monitorNames: string[]
}

const MAX_RANGE_DAYS = 62

function itemDate(trip: ScheduleTrip, dayNumber: number) {
  return addDays(new Date(trip.startDate), dayNumber - 1)
}

function defaultRange(): DateRange {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return { from: today, to: addDays(today, 20) }
}

export default function AdminSchedulePage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultRange)
  const [trips, setTrips] = useState<ScheduleTrip[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [schoolFilter, setSchoolFilter] = useState<string[]>([])
  const [destinationFilter, setDestinationFilter] = useState<string[]>([])
  const [monitorFilter, setMonitorFilter] = useState<string[]>([])
  const [executiveFilter, setExecutiveFilter] = useState<string[]>([])

  const load = useCallback(async (from: Date, to: Date) => {
    setTrips(null)
    setLoadError(null)
    const params = new URLSearchParams({ from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') })
    const res = await fetch(`/api/v1/admin/schedule?${params}`)
    if (res.ok) {
      setTrips((await res.json()).trips)
    } else {
      const data = await res.json().catch(() => null)
      setLoadError(data?.error?.message ?? 'No se pudo cargar el calendario.')
    }
  }, [])

  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return
    const from = dateRange.from
    const to = dateRange.to
    const id = window.setTimeout(() => void load(from, to), 0)
    return () => window.clearTimeout(id)
  }, [dateRange, load])

  const schoolOptions = useMemo(
    () => Array.from(new Set((trips ?? []).map((trip) => trip.school.name))).sort(),
    [trips]
  )
  const destinationOptions = useMemo(
    () => Array.from(new Set((trips ?? []).map((trip) => trip.destination))).sort(),
    [trips]
  )
  const monitorOptions = useMemo(
    () => Array.from(new Set((trips ?? []).flatMap((trip) => trip.monitorNames))).sort(),
    [trips]
  )
  const executiveOptions = useMemo(
    () => Array.from(new Set((trips ?? []).map((trip) => trip.salesExecutive).filter((v): v is string => !!v))).sort(),
    [trips]
  )

  const filteredTrips = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (trips ?? []).filter((trip) => {
      const matchesSearch = !query || trip.name.toLowerCase().includes(query)
      const matchesSchool = schoolFilter.length === 0 || schoolFilter.includes(trip.school.name)
      const matchesDestination = destinationFilter.length === 0 || destinationFilter.includes(trip.destination)
      const matchesMonitor =
        monitorFilter.length === 0 || trip.monitorNames.some((name) => monitorFilter.includes(name))
      const matchesExecutive = executiveFilter.length === 0 || (!!trip.salesExecutive && executiveFilter.includes(trip.salesExecutive))
      return matchesSearch && matchesSchool && matchesDestination && matchesMonitor && matchesExecutive
    })
  }, [trips, search, schoolFilter, destinationFilter, monitorFilter, executiveFilter])

  const days = useMemo(() => {
    if (!filteredTrips.length || !dateRange?.from || !dateRange?.to) return []
    const starts = filteredTrips.map((trip) => new Date(trip.startDate).getTime())
    const ends = filteredTrips.map((trip) => new Date(trip.endDate).getTime())
    // Clamp to the selected range so a trip that runs longer than the picked
    // dates doesn't blow the grid out past what the user actually asked to see.
    const start = Math.max(Math.min(...starts), dateRange.from.getTime())
    const end = Math.min(Math.max(...ends), dateRange.to.getTime())
    if (start > end) return []
    return eachDayOfInterval({ start: new Date(start), end: new Date(end) })
  }, [filteredTrips, dateRange])
  const spanTooLarge = days.length > MAX_RANGE_DAYS

  return (
    <TooltipProvider delayDuration={200}>
      <SiteHeader title="Organizador" subtitle="Grilla de actividades por día" />
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
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

        {loadError && !trips ? (
          <FetchError
            message={loadError}
            onRetry={() => dateRange?.from && dateRange?.to && void load(dateRange.from, dateRange.to)}
          />
        ) : !trips ? (
          <Skeleton className="h-96 w-full" />
        ) : spanTooLarge ? (
          <EmptyState
            icon={LayoutGridIcon}
            title="Los grupos visibles abarcan un rango muy amplio."
            description={`Achica los filtros o el rango de fechas para ver el detalle día por día (máximo ${MAX_RANGE_DAYS} días).`}
          />
        ) : filteredTrips.length ? (
          <Card className="min-h-0 flex-1 overflow-hidden">
            <Table containerClassName="h-full" className="h-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 top-0 z-20 w-40 bg-background">Grupo</TableHead>
                  <TableHead className="sticky top-0 z-10 w-28 bg-background">Colegio</TableHead>
                  <TableHead className="sticky top-0 z-10 w-24 bg-background">Ejecutivo</TableHead>
                  <TableHead className="sticky top-0 z-10 w-14 bg-background">Pax</TableHead>
                  <TableHead className="sticky top-0 z-10 w-28 bg-background">Hotel</TableHead>
                  <TableHead className="sticky top-0 z-10 w-28 bg-background">In-Out</TableHead>
                  {days.map((day) => (
                    <TableHead
                      key={day.toISOString()}
                      className="sticky top-0 z-10 whitespace-nowrap bg-background text-center"
                    >
                      <span className="block capitalize">{format(day, 'EEE', { locale: es })}</span>
                      {format(day, 'd MMM', { locale: es })}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrips.map((trip) => {
                  const start = new Date(trip.startDate)
                  const end = new Date(trip.endDate)
                  return (
                    <TableRow key={trip.id}>
                      <TableCell className="sticky left-0 z-10 w-40 bg-background py-5 font-medium">
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/admin/trips/${trip.id}`} className="block min-w-0 truncate hover:underline">
                                {trip.name}
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>{trip.name}</TooltipContent>
                          </Tooltip>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                aria-label={`Más detalle de ${trip.name}`}
                                className="shrink-0 text-muted-foreground hover:text-foreground"
                              >
                                <InfoIcon className="size-3.5" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-80">
                              <TripDetailPopoverContent trip={trip} />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <p className="text-xs font-normal text-muted-foreground">
                          Día {trip.currentDay} de {trip.totalDays}
                        </p>
                      </TableCell>
                      <TableCell className="w-28 py-5 text-muted-foreground">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate">{trip.school.name}</span>
                          </TooltipTrigger>
                          <TooltipContent>{trip.school.name}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="w-24 py-5 text-muted-foreground">
                        <span className="block truncate">{trip.salesExecutive || '—'}</span>
                      </TableCell>
                      <TableCell className="w-14 py-5">{trip.studentCount}</TableCell>
                      <TableCell className="w-28 py-5 text-muted-foreground">
                        {trip.hotel ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="block truncate">{trip.hotel}</span>
                            </TooltipTrigger>
                            <TooltipContent>{trip.hotel}</TooltipContent>
                          </Tooltip>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="w-28 whitespace-nowrap py-5 text-muted-foreground">
                        {format(start, 'd MMM', { locale: es })}–{format(end, 'd MMM', { locale: es })}
                      </TableCell>
                      {days.map((day) => {
                        if (day < start || day > end) {
                          return <TableCell key={day.toISOString()} className="bg-muted/20" />
                        }
                        const dayItems = trip.itineraryItems.filter((item) => isSameDay(itemDate(trip, item.dayNumber), day))
                        return (
                          <TableCell key={day.toISOString()} className="w-32 max-w-32 py-5 align-top text-xs">
                            <div className="flex flex-col gap-1.5">
                              {dayItems.map((item, idx) => (
                                <span key={idx} className="flex items-start gap-1.5">
                                  <span className="shrink-0 text-muted-foreground">–</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="line-clamp-3 min-w-0 cursor-default">
                                        {item.title} <span className="text-muted-foreground">({item.time})</span>
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {item.title} ({item.time})
                                    </TooltipContent>
                                  </Tooltip>
                                </span>
                              ))}
                            </div>
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <EmptyState
            icon={LayoutGridIcon}
            title="Sin grupos en este rango."
            description="Ajusta las fechas o los filtros para ver otros grupos."
          />
        )}
      </div>
    </TooltipProvider>
  )
}

function TripDetailPopoverContent({ trip }: { trip: ScheduleTrip }) {
  const start = new Date(trip.startDate)
  const end = new Date(trip.endDate)
  const dayNumbers = Array.from(new Set(trip.itineraryItems.map((item) => item.dayNumber))).sort((a, b) => a - b)

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="font-medium">{trip.name}</p>
        <p className="text-xs text-muted-foreground">
          {trip.school.name} · {trip.destination}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Fechas</p>
          <p>
            {format(start, 'd MMM', { locale: es })}–{format(end, 'd MMM', { locale: es })}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Día actual</p>
          <p>
            {trip.currentDay} de {trip.totalDays}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Alumnos</p>
          <p>{trip.studentCount}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Hotel</p>
          <p>{trip.hotel ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ejecutivo</p>
          <p>{trip.salesExecutive ?? '—'}</p>
        </div>
      </div>
      {dayNumbers.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t pt-3">
          {dayNumbers.map((dayNumber) => {
            const items = trip.itineraryItems
              .filter((item) => item.dayNumber === dayNumber)
              .sort((a, b) => a.time.localeCompare(b.time))
            return (
              <div key={dayNumber} className="text-sm">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  Día {dayNumber}
                  <Badge variant="outline" className="font-normal">
                    {format(itemDate(trip, dayNumber), 'd MMM', { locale: es })}
                  </Badge>
                </div>
                <ul className="ml-1 mt-1 flex flex-col gap-0.5">
                  {items.map((item, idx) => (
                    <li key={idx} className="text-xs">
                      {item.time} — {item.title}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
      <Link href={`/admin/trips/${trip.id}`} className="text-xs text-primary hover:underline">
        Ver grupo completo →
      </Link>
    </div>
  )
}
