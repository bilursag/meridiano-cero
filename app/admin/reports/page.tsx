'use client'

import { useEffect, useMemo, useState } from 'react'
import { DownloadIcon } from 'lucide-react'
import type { Announcement, AnnouncementType } from '@prisma/client'
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
import { announcementTypeLabels } from '@/lib/labels'
import type { TripRow } from '@/components/data-table'

type ReportRow = Announcement & { trip: { id: string; name: string; school: { name: string } } }

const TYPE_BADGE_VARIANT: Record<AnnouncementType, 'destructive' | 'secondary' | 'outline'> = {
  ALERT: 'destructive',
  ACHIEVEMENT: 'secondary',
  INFO: 'outline',
}

function downloadCsv(trips: TripRow[]) {
  const header = ['Nombre', 'Colegio', 'Destino', 'Estado', 'Día', 'Alumnos', 'Inicio', 'Término']
  const rows = trips.map((trip) => [
    trip.name,
    trip.school.name,
    trip.destination,
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
  link.download = `giras-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportRow[] | null>(null)
  const [trips, setTrips] = useState<TripRow[]>([])
  const [typeFilter, setTypeFilter] = useState<AnnouncementType | 'ALL'>('ALL')

  useEffect(() => {
    void (async () => {
      const [reportsRes, tripsRes] = await Promise.all([
        fetch('/api/v1/admin/reports'),
        fetch('/api/v1/trips'),
      ])
      if (reportsRes.ok) setReports((await reportsRes.json()).announcements)
      if (tripsRes.ok) setTrips((await tripsRes.json()).trips)
    })()
  }, [])

  const filtered = useMemo(
    () => (reports ?? []).filter((report) => typeFilter === 'ALL' || report.type === typeFilter),
    [reports, typeFilter]
  )

  return (
    <>
      <SiteHeader
        title="Reportes"
        subtitle="Alertas y logros reportados en terreno"
        right={
          <Button variant="outline" size="xs" onClick={() => downloadCsv(trips)} disabled={!trips.length}>
            <DownloadIcon />
            Exportar giras (CSV)
          </Button>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as AnnouncementType | 'ALL')}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los tipos</SelectItem>
              <SelectItem value="ALERT">Alertas</SelectItem>
              <SelectItem value="ACHIEVEMENT">Logros</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="overflow-hidden">
          {!reports ? (
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Gira</TableHead>
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
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Sin reportes para este filtro.
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
