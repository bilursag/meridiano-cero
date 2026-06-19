'use client'

import { useCallback, useEffect, useState } from 'react'
import { SiteHeader } from '@/components/site-header'
import { DataTable, type TripRow } from '@/components/data-table'
import { CreateTripSheet } from '@/components/create-trip-sheet'

export default function AdminTripsPage() {
  const [trips, setTrips] = useState<TripRow[]>([])

  const loadTrips = useCallback(async () => {
    const res = await fetch('/api/v1/trips')
    if (res.ok) setTrips((await res.json()).trips)
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadTrips()
    }, 0)

    return () => window.clearTimeout(id)
  }, [loadTrips])

  return (
    <>
      <SiteHeader title="Giras" subtitle="Gestión completa de giras escolares" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <DataTable data={trips} toolbarAction={<CreateTripSheet onCreated={loadTrips} />} />
          </div>
        </div>
      </div>
    </>
  )
}
