"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import type { TripRow } from "@/components/data-table"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const chartConfig = {
  activity: {
    label: "Actividad",
  },
  familias: {
    label: "Familias",
    color: "var(--color-foreground)",
  },
  monitores: {
    label: "Monitores",
    color: "var(--color-muted-foreground)",
  },
} satisfies ChartConfig

function buildChartData(trips: TripRow[]) {
  const reference = new Date("2026-06-30T00:00:00")
  const seed = Math.max(trips.length, 1)

  return Array.from({ length: 91 }, (_, index) => {
    const date = new Date(reference)
    date.setDate(reference.getDate() - (90 - index))

    const trip = trips[index % seed]
    const base = trip ? trip.studentCount + trip.currentDay * 8 : 42
    const familias = Math.max(
      12,
      Math.round(base + Math.sin(index / 3) * 30 + ((index * 23) % 80))
    )
    const monitores = Math.max(
      8,
      Math.round(base * 0.45 + Math.cos(index / 4) * 18 + ((index * 17) % 46))
    )

    return {
      date: date.toISOString().slice(0, 10),
      familias,
      monitores,
    }
  })
}

export function AdminActivityChart({ trips }: { trips: TripRow[] }) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")
  const chartData = React.useMemo(() => buildChartData(trips), [trips])

  React.useEffect(() => {
    if (!isMobile) return
    const id = window.setTimeout(() => setTimeRange("7d"), 0)
    return () => window.clearTimeout(id)
  }, [isMobile])

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2026-06-30T00:00:00")
    let daysToSubtract = 90

    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }

    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)

    return date >= startDate
  })

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Actividad de la plataforma</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Señales, comunicados y uso durante los últimos 3 meses
          </span>
          <span className="@[540px]/card:hidden">Últimos 3 meses</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(value) => {
              if (value) setTimeRange(value)
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">3 meses</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 días</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 días</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex h-8 w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              aria-label="Seleccionar rango"
            >
              <SelectValue placeholder="Últimos 3 meses" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                3 meses
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                30 días
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                7 días
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillFamilias" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-familias)" stopOpacity={0.95} />
                <stop offset="95%" stopColor="var(--color-familias)" stopOpacity={0.08} />
              </linearGradient>
              <linearGradient id="fillMonitores" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-monitores)" stopOpacity={0.72} />
                <stop offset="95%" stopColor="var(--color-monitores)" stopOpacity={0.08} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("es-CL", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    if (!value) return ""
                    return new Date(value).toLocaleDateString("es-CL", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="monitores"
              type="natural"
              fill="url(#fillMonitores)"
              stroke="var(--color-monitores)"
              stackId="a"
            />
            <Area
              dataKey="familias"
              type="natural"
              fill="url(#fillFamilias)"
              stroke="var(--color-familias)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
