"use client"

import { useState } from "react"
import { PlusIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/date-range-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const EMPTY_FORM = {
  name: "",
  schoolName: "",
  destination: "",
  totalDays: "",
  studentCount: "",
  initialLat: "",
  initialLng: "",
  parentCode: "",
  monitorCode: "",
}

const FORM_FIELDS: { key: keyof typeof EMPTY_FORM; label: string; type?: string }[] = [
  { key: "name", label: "Nombre de la gira" },
  { key: "schoolName", label: "Colegio" },
  { key: "destination", label: "Destino" },
  { key: "totalDays", label: "Días totales", type: "number" },
  { key: "studentCount", label: "N° de alumnos", type: "number" },
  { key: "initialLat", label: "Latitud inicial", type: "number" },
  { key: "initialLng", label: "Longitud inicial", type: "number" },
  { key: "parentCode", label: "Código apoderado" },
  { key: "monitorCode", label: "Código monitor" },
]

export function CreateTripSheet({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [submitting, setSubmitting] = useState(false)

  async function handleCreateTrip() {
    if (!dateRange?.from || !dateRange?.to) return
    setSubmitting(true)
    const res = await fetch("/api/v1/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        totalDays: Number(form.totalDays),
        studentCount: Number(form.studentCount),
        initialLat: Number(form.initialLat),
        initialLng: Number(form.initialLng),
      }),
    })
    setSubmitting(false)
    if (res.ok) {
      setForm(EMPTY_FORM)
      setDateRange(undefined)
      setOpen(false)
      onCreated()
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusIcon />
          <span className="hidden lg:inline">Nueva gira</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader className="gap-1">
          <SheetTitle>Nueva gira</SheetTitle>
          <SheetDescription>
            Crea una gira y genera sus códigos de acceso para apoderados y monitor.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-4 text-sm">
          <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
            {FORM_FIELDS.slice(0, 3).map(({ key, label, type }) => (
              <div key={key} className="flex flex-col gap-2">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  type={type}
                  placeholder={label}
                  value={form[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="flex flex-col gap-2">
              <Label>Fechas de la gira</Label>
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>
            {FORM_FIELDS.slice(3).map(({ key, label, type }) => (
              <div key={key} className="flex flex-col gap-2">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  type={type}
                  placeholder={label}
                  value={form[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                />
              </div>
            ))}
          </form>
        </div>
        <SheetFooter className="mt-auto flex gap-2 sm:flex-col sm:space-x-0">
          <Button
            className="w-full"
            onClick={handleCreateTrip}
            disabled={submitting || !dateRange?.from || !dateRange?.to}
          >
            {submitting ? "Creando…" : "Crear gira"}
          </Button>
          <SheetClose asChild>
            <Button variant="outline" className="w-full">
              Cancelar
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
