'use client'

import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { es } from 'date-fns/locale'
import type { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

function formatRange(range?: DateRange) {
  if (!range?.from) return 'Selecciona las fechas'
  const from = range.from.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
  if (!range.to) return from
  const to = range.to.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${from} – ${to}`
}

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          type="button"
          className={cn('w-full justify-start text-left font-normal', !value?.from && 'text-muted-foreground')}
        >
          <CalendarIcon className="size-4" />
          {formatRange(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          locale={es}
          selected={value}
          onSelect={onChange}
          defaultMonth={value?.from}
        />
      </PopoverContent>
    </Popover>
  )
}
