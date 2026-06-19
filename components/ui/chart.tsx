"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"
import type {
  TooltipPayloadEntry,
  TooltipValueType,
} from "recharts"

import { cn } from "@/lib/utils"

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<"light" | "dark", string> }
  )
}

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"]
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-sector]:outline-none [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

const THEMES = { light: "", dark: ".dark" } as const

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, config]) => config.theme || config.color)

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  label,
  labelFormatter,
  formatter,
}: React.ComponentProps<"div"> & {
    active?: boolean
    payload?: TooltipPayloadEntry<TooltipValueType, string>[]
    label?: string
    labelFormatter?: (
      label: string | undefined,
      payload: TooltipPayloadEntry<TooltipValueType, string>[]
    ) => React.ReactNode
    formatter?: (
      value: TooltipValueType | undefined,
      name: string | number | undefined,
      item: TooltipPayloadEntry<TooltipValueType, string>,
      index: number,
      payload: TooltipPayloadEntry<TooltipValueType, string>[]
    ) => React.ReactNode
    indicator?: "line" | "dot" | "dashed"
  }) {
  const { config } = useChart()

  if (!active || !payload?.length) {
    return null
  }

  const tooltipLabel = labelFormatter ? labelFormatter(label, payload) : label

  return (
    <div
      className={cn(
        "grid min-w-32 gap-1.5 rounded-lg border bg-background px-2.5 py-2 text-xs shadow-xl",
        className
      )}
    >
      {tooltipLabel ? <div className="font-medium">{tooltipLabel}</div> : null}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = `${item.dataKey || item.name || "value"}`
          const itemConfig = config[key]
          const color = item.color || `var(--color-${key})`

          return (
            <div key={key} className="flex items-center gap-2">
              {indicator === "dot" ? (
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
              ) : (
                <span
                  className={cn(
                    "h-0.5 w-3 shrink-0 rounded-full",
                    indicator === "dashed" && "border-t border-dashed bg-transparent"
                  )}
                  style={{ backgroundColor: indicator === "line" ? color : undefined, borderColor: color }}
                />
              )}
              <span className="text-muted-foreground">{itemConfig?.label || item.name}</span>
              <span className="ml-auto font-mono font-medium text-foreground">
                {formatter ? formatter(item.value, item.name, item, index, payload) : item.value?.toLocaleString()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { ChartContainer, ChartTooltip, ChartTooltipContent }
