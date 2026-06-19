'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPinPlusIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DateRangePicker } from '@/components/date-range-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const EMPTY_FORM = {
  name: '',
  schoolName: '',
  destination: '',
  totalDays: '',
  studentCount: '',
  initialLat: '',
  initialLng: '',
  parentCode: '',
  monitorCode: '',
}

const FORM_FIELDS: { key: keyof typeof EMPTY_FORM; label: string; type?: string }[] = [
  { key: 'name', label: 'Nombre de la gira' },
  { key: 'schoolName', label: 'Colegio' },
  { key: 'destination', label: 'Destino' },
  { key: 'totalDays', label: 'Días totales', type: 'number' },
  { key: 'studentCount', label: 'N° de alumnos', type: 'number' },
  { key: 'initialLat', label: 'Latitud inicial', type: 'number' },
  { key: 'initialLng', label: 'Longitud inicial', type: 'number' },
  { key: 'parentCode', label: 'Código apoderado' },
  { key: 'monitorCode', label: 'Código monitor' },
]

export default function NewTripPage() {
  const router = useRouter()
  const [form, setForm] = useState(EMPTY_FORM)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreateTrip() {
    if (!dateRange?.from || !dateRange?.to) return
    setSubmitting(true)
    setError(null)
    const res = await fetch('/api/v1/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      const { trip } = await res.json()
      router.push(`/admin/trips/${trip.id}`)
    } else {
      const data = await res.json().catch(() => null)
      setError(data?.error?.message ?? 'No se pudo crear la gira.')
    }
  }

  return (
    <>
      <SiteHeader title="Nueva gira" subtitle="Crea una gira y genera sus códigos de acceso" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <Card className="mx-auto w-full max-w-4xl">
          <CardContent className="p-6">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <MapPinPlusIcon size={18} />
              </span>
              <div>
                <p className="font-semibold">Detalles de la gira</p>
                <p className="text-sm text-muted-foreground">
                  Estos datos quedarán disponibles para apoderados y monitores.
                </p>
              </div>
            </div>

            <form
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              onSubmit={(e) => e.preventDefault()}
            >
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
              <div className="flex flex-col gap-2 sm:col-span-2">
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

            {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" asChild>
                <Link href="/admin/trips">Cancelar</Link>
              </Button>
              <Button onClick={handleCreateTrip} disabled={submitting || !dateRange?.from || !dateRange?.to}>
                {submitting ? 'Creando…' : 'Crear gira'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
