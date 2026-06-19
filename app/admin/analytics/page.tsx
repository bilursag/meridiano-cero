'use client'

import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SiteHeader } from '@/components/site-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { tripStatusLabels, announcementTypeLabels } from '@/lib/labels'
import type { TripStatus, AnnouncementType } from '@prisma/client'

type Analytics = {
  tripsByStatus: { status: TripStatus; count: number }[]
  announcementsByType: { type: AnnouncementType; count: number }[]
  tripCount: number
  schoolCount: number
  codesIssued: number
  codesRedeemed: number
  dailyAnnouncements: { date: string; count: number }[]
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null)

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/v1/admin/analytics')
      if (res.ok) setData(await res.json())
    })()
  }, [])

  if (!data) {
    return (
      <>
        <SiteHeader title="Analítica" subtitle="Métricas de la plataforma" />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    )
  }

  const redemptionRate = data.codesIssued
    ? Math.round((data.codesRedeemed / data.codesIssued) * 100)
    : 0

  return (
    <>
      <SiteHeader title="Analítica" subtitle="Métricas de la plataforma" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          {[
            { label: 'Giras totales', value: data.tripCount },
            { label: 'Colegios', value: data.schoolCount },
            { label: 'Códigos emitidos', value: data.codesIssued },
            { label: 'Tasa de canje', value: `${redemptionRate}%` },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <CardDescription>{stat.label}</CardDescription>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-3xl font-semibold tabular-nums">{stat.value}</CardTitle>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Giras por estado</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.tripsByStatus.map((row) => ({ ...row, label: tripStatusLabels[row.status] }))}>
                  <CartesianGrid vertical={false} strokeOpacity={0.3} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" radius={4} fill="var(--color-foreground)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comunicados por tipo (30 días)</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.announcementsByType.map((row) => ({
                    ...row,
                    label: announcementTypeLabels[row.type],
                  }))}
                >
                  <CartesianGrid vertical={false} strokeOpacity={0.3} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" radius={4} fill="var(--color-muted-foreground)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Comunicados emitidos (14 días)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyAnnouncements}>
                <defs>
                  <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-foreground)" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="var(--color-foreground)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeOpacity={0.3} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString('es-CL')} />
                <Area dataKey="count" type="monotone" stroke="var(--color-foreground)" fill="url(#fillCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
