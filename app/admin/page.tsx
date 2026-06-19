'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRightIcon } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SectionCards } from '@/components/section-cards'
import { AdminActivityChart } from '@/components/admin-activity-chart'
import { type TripRow } from '@/components/data-table'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function AdminPage() {
  const [trips, setTrips] = useState<TripRow[]>([])

  useEffect(() => {
    const id = window.setTimeout(async () => {
      const res = await fetch('/api/v1/trips')
      if (res.ok) setTrips((await res.json()).trips)
    }, 0)

    return () => window.clearTimeout(id)
  }, [])

  const schoolCount = new Set(trips.map((t) => t.school.name)).size
  const codeCount = trips.reduce((sum, t) => sum + t.accessCodes.length, 0)
  const monitorCount = trips.reduce(
    (sum, t) => sum + t.accessCodes.filter((code) => code.role === 'MONITOR').length,
    0
  )
  const recentTrips = trips.slice(0, 5)

  return (
    <>
      <SiteHeader title="Dashboard" subtitle="Administración de giras" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <SectionCards
              tripCount={trips.length}
              codeCount={codeCount}
              schoolCount={schoolCount}
              monitorCount={monitorCount}
            />
            <div className="px-4 lg:px-6">
              <AdminActivityChart trips={trips} />
            </div>
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Giras recientes</CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/admin/trips">
                      Ver todas
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
                        <TableHead>Día</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentTrips.length ? (
                        recentTrips.map((trip) => (
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
                            <TableCell>
                              {trip.currentDay}/{trip.totalDays}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            Sin giras todavía.
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
