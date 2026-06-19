import { Activity, ArrowDownRight, ArrowUpRight, Radio, School, Ticket } from "lucide-react"

import {
  Card,
  CardDescription,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface SectionCardsProps {
  tripCount: number
  codeCount: number
  schoolCount: number
  monitorCount: number
}

export function SectionCards({ tripCount, codeCount, schoolCount, monitorCount }: SectionCardsProps) {
  const cards = [
    {
      Icon: Activity,
      label: "Giras activas",
      value: tripCount,
      trend: "+12.5%",
      positive: true,
      detail: "Operación del mes",
      footer: "Viajes con seguimiento activo",
    },
    {
      Icon: Ticket,
      label: "Códigos emitidos",
      value: codeCount,
      trend: "+8.2%",
      positive: true,
      detail: "Accesos disponibles",
      footer: "Códigos de apoderado y monitor",
    },
    {
      Icon: School,
      label: "Colegios",
      value: schoolCount,
      trend: "+4.5%",
      positive: true,
      detail: "Cuentas institucionales",
      footer: "Colegios con giras activas",
    },
    {
      Icon: Radio,
      label: "Monitores",
      value: monitorCount,
      trend: "-2.0%",
      positive: false,
      detail: "Equipo en terreno",
      footer: "Usuarios habilitados para reportar",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 px-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 lg:px-6">
      {cards.map(({ Icon, label, value, trend, positive, detail, footer }) => {
        const TrendIcon = positive ? ArrowUpRight : ArrowDownRight

        return (
          <Card key={label} className="min-h-[204px] overflow-hidden bg-gradient-to-b from-card to-muted/30">
            <CardHeader className="space-y-0 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                    <Icon size={17} />
                  </div>
                  <CardDescription>{label}</CardDescription>
                </div>
                <Badge variant="outline" className="gap-1 rounded-md">
                  <TrendIcon className="size-3" />
                  {trend}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-4xl font-semibold tracking-tight tabular-nums">
                {value}
              </CardTitle>
              <div className="mt-8 space-y-2">
                <p className="text-sm font-medium">{detail}</p>
                <p className="text-sm text-muted-foreground">{footer}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
