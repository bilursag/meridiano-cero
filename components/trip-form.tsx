"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PlusIcon, RefreshCwIcon, XIcon } from "lucide-react"
import { differenceInCalendarDays } from "date-fns"
import type { DateRange } from "react-day-picker"
import type { Trip } from "@prisma/client"

import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/date-range-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { KNOWN_DESTINATIONS } from "@/lib/destinations"
import { generateAccessCode } from "@/lib/generate-code"

const CUSTOM_DESTINATION = "custom"

type ProgramOption = { id: string; name: string }
type ExtraLeg = { key: string; destinationId: string }

const EMPTY_FORM = {
  name: "",
  school: "",
  grade: "",
  salesExecutive: "",
  destination: "",
  studentCountMale: "",
  studentCountFemale: "",
  companionCountMale: "",
  companionCountFemale: "",
  initialLat: "",
  initialLng: "",
  hotel: "",
  parentCode: "",
  monitorCode: "",
  studentCode: "",
}

const LAST_SCHOOL_STORAGE_KEY = "meridiano-cero:last-school-name"

/**
 * Shared by the "Nuevo grupo" Sheet (components/create-trip-sheet.tsx) and the
 * standalone /admin/trips/new page — the only real differences between the two
 * are the wrapping chrome (Sheet vs full page) and what happens on success, both
 * handled by the caller via `className`/`onSuccess`. The submit button lives
 * outside this component (connected via the `form` HTML attribute + `formId`)
 * so callers can place it outside a scrollable container, e.g. a Sheet footer.
 */
export function TripForm({
  formId,
  className,
  onSuccess,
  onStateChange,
}: {
  formId: string
  className?: string
  onSuccess: (trip: Trip) => void
  onStateChange?: (state: { canSubmit: boolean; submitting: boolean }) => void
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false)
  const [destinationId, setDestinationId] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [programs, setPrograms] = useState<ProgramOption[]>([])
  const [programsError, setProgramsError] = useState<string | null>(null)
  const [programId, setProgramId] = useState("")
  const [extraLegs, setExtraLegs] = useState<ExtraLeg[]>([])
  const legKeyCounter = useRef(0)

  const loadPrograms = useCallback(async () => {
    setProgramsError(null)
    try {
      const res = await fetch("/api/v1/admin/programs")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPrograms(data.programs)
    } catch {
      setProgramsError("No se pudieron cargar los programas. Intenta de nuevo.")
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadPrograms()
      const lastSchool = window.localStorage.getItem(LAST_SCHOOL_STORAGE_KEY)
      if (lastSchool) setForm((p) => ({ ...p, school: lastSchool }))
    }, 0)
    return () => window.clearTimeout(id)
  }, [loadPrograms])

  function handleSchoolChange(name: string) {
    setForm((p) => ({ ...p, school: name }))
  }

  const autoName = useMemo(() => {
    const programName = programs.find((p) => p.id === programId)?.name
    const year = dateRange?.from?.getFullYear()
    return [form.school.trim(), form.grade.trim(), programName, year].filter(Boolean).join(" ")
  }, [form.school, form.grade, programs, programId, dateRange])

  // Adjusting state during render (rather than in an effect) avoids an extra
  // post-paint render pass — see https://react.dev/learn/you-might-not-need-an-effect.
  const [prevAutoName, setPrevAutoName] = useState(autoName)
  if (autoName !== prevAutoName) {
    setPrevAutoName(autoName)
    if (!nameManuallyEdited) setForm((p) => ({ ...p, name: autoName }))
  }

  const isCustomDestination = destinationId === CUSTOM_DESTINATION
  const totalDays =
    dateRange?.from && dateRange?.to ? differenceInCalendarDays(dateRange.to, dateRange.from) + 1 : null

  const resolvedExtraLegs = extraLegs
    .map((leg) => KNOWN_DESTINATIONS.find((d) => d.id === leg.destinationId))
    .filter((d): d is (typeof KNOWN_DESTINATIONS)[number] => !!d)

  function handleDestinationChange(id: string) {
    setDestinationId(id)
    if (id === CUSTOM_DESTINATION) {
      setForm((p) => ({ ...p, destination: "", initialLat: "", initialLng: "" }))
      return
    }
    const known = KNOWN_DESTINATIONS.find((d) => d.id === id)
    if (known) {
      setForm((p) => ({ ...p, destination: known.label, initialLat: String(known.lat), initialLng: String(known.lng) }))
    }
  }

  function addLeg() {
    legKeyCounter.current += 1
    setExtraLegs((p) => [...p, { key: String(legKeyCounter.current), destinationId: "" }])
  }

  function updateLeg(key: string, destinationId: string) {
    setExtraLegs((p) => p.map((leg) => (leg.key === key ? { ...leg, destinationId } : leg)))
    const known = KNOWN_DESTINATIONS.find((d) => d.id === destinationId)
    if (known && form.destination.trim()) {
      const labels = [form.destination, ...extraLegs.map((leg) => (leg.key === key ? known.label : KNOWN_DESTINATIONS.find((d) => d.id === leg.destinationId)?.label)).filter(Boolean)]
      setForm((p) => ({ ...p, destination: labels.join(" → ") }))
    }
  }

  function removeLeg(key: string) {
    setExtraLegs((p) => p.filter((leg) => leg.key !== key))
  }

  async function handleCreateTrip() {
    if (!dateRange?.from || !dateRange?.to || !programId) return
    setSubmitting(true)
    setError(null)
    const legs =
      resolvedExtraLegs.length > 0
        ? [
            { label: form.destination.trim(), lat: Number(form.initialLat), lng: Number(form.initialLng) },
            ...resolvedExtraLegs.map((d) => ({ label: d.label, lat: d.lat, lng: d.lng })),
          ]
        : undefined
    const studentCountMale = Number(form.studentCountMale) || 0
    const studentCountFemale = Number(form.studentCountFemale) || 0
    const res = await fetch("/api/v1/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        grade: form.grade.trim() || undefined,
        salesExecutive: form.salesExecutive.trim() || undefined,
        school: form.school.trim(),
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        studentCount: studentCountMale + studentCountFemale,
        studentCountMale,
        studentCountFemale,
        companionCountMale: form.companionCountMale ? Number(form.companionCountMale) : undefined,
        companionCountFemale: form.companionCountFemale ? Number(form.companionCountFemale) : undefined,
        initialLat: Number(form.initialLat),
        initialLng: Number(form.initialLng),
        hotel: form.hotel.trim() || undefined,
        programId,
        legs,
      }),
    })
    setSubmitting(false)
    if (res.ok) {
      const { trip } = await res.json()
      window.localStorage.setItem(LAST_SCHOOL_STORAGE_KEY, form.school.trim())
      onSuccess(trip)
    } else {
      const data = await res.json().catch(() => null)
      setError(data?.error?.message ?? "No se pudo crear el grupo.")
    }
  }

  const totalStudents = (Number(form.studentCountMale) || 0) + (Number(form.studentCountFemale) || 0)

  const canSubmit =
    !submitting &&
    !!dateRange?.from &&
    !!dateRange?.to &&
    !!destinationId &&
    !!form.destination.trim() &&
    form.initialLat !== "" &&
    form.initialLng !== "" &&
    !!programId &&
    !!form.school.trim() &&
    totalStudents > 0

  useEffect(() => {
    onStateChange?.({ canSubmit, submitting })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSubmit, submitting])

  return (
    <>
      <form
        id={formId}
        className={className}
        onSubmit={(e) => {
          e.preventDefault()
          void handleCreateTrip()
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="school">Colegio</Label>
          <Input
            id="school"
            placeholder="Nombre del colegio"
            value={form.school}
            onChange={(e) => handleSchoolChange(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="grade">Curso</Label>
          <Input
            id="grade"
            placeholder="Ej: 4to Medio B"
            value={form.grade}
            onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="salesExecutive">Ejecutivo</Label>
          <Input
            id="salesExecutive"
            placeholder="Nombre del ejecutivo de ventas"
            value={form.salesExecutive}
            onChange={(e) => setForm((p) => ({ ...p, salesExecutive: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="name">Nombre del grupo</Label>
          <Input
            id="name"
            placeholder="Se genera automáticamente con colegio, curso, programa y año"
            value={form.name}
            onChange={(e) => {
              setNameManuallyEdited(true)
              setForm((p) => ({ ...p, name: e.target.value }))
            }}
          />
          <p className="text-xs text-muted-foreground">
            Se autogenera a partir del colegio, curso, programa y año — puedes sobrescribirlo.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Destino</Label>
          <Select value={destinationId} onValueChange={handleDestinationChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un destino" />
            </SelectTrigger>
            <SelectContent>
              {KNOWN_DESTINATIONS.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.label}
                </SelectItem>
              ))}
              <SelectItem value={CUSTOM_DESTINATION}>Otro destino…</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isCustomDestination ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="destination">Nombre del destino</Label>
            <Input
              id="destination"
              placeholder="Nombre del destino"
              value={form.destination}
              onChange={(e) => setForm((p) => ({ ...p, destination: e.target.value }))}
            />
          </div>
        ) : null}

        {extraLegs.length > 0 ? (
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label>Destinos adicionales</Label>
            {extraLegs.map((leg, index) => (
              <div key={leg.key} className="flex gap-2">
                <Select value={leg.destinationId} onValueChange={(value) => updateLeg(leg.key, value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={`Destino ${index + 2}…`} />
                  </SelectTrigger>
                  <SelectContent>
                    {KNOWN_DESTINATIONS.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => removeLeg(leg.key)}>
                  <XIcon className="size-4" />
                  <span className="sr-only">Quitar destino</span>
                </Button>
              </div>
            ))}
          </div>
        ) : null}
        <Button type="button" variant="outline" size="sm" className="sm:col-span-2 justify-self-start" onClick={addLeg}>
          <PlusIcon />
          Agregar destino
        </Button>

        <div className="flex flex-col gap-2">
          <Label>Programa</Label>
          <Select value={programId} onValueChange={setProgramId} disabled={programs.length === 0}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={programs.length ? "Elegir un programa…" : "No hay programas creados"} />
            </SelectTrigger>
            <SelectContent>
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {programsError ? (
            <div className="flex items-center gap-2">
              <p className="text-xs text-destructive">{programsError}</p>
              <Button type="button" variant="ghost" size="sm" className="h-auto p-0 text-xs underline" onClick={() => void loadPrograms()}>
                Reintentar
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {programs.length
                ? "El itinerario se completa automáticamente con las actividades de este programa."
                : "Primero crea un programa en /admin/programs."}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label>Fechas del grupo</Label>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          {totalDays ? (
            <p className="text-xs text-muted-foreground">
              Duración: {totalDays} día{totalDays === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label>Alumnos por género</Label>
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              placeholder="Alumnos"
              value={form.studentCountMale}
              onChange={(e) => setForm((p) => ({ ...p, studentCountMale: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="Alumnas"
              value={form.studentCountFemale}
              onChange={(e) => setForm((p) => ({ ...p, studentCountFemale: e.target.value }))}
            />
          </div>
          <p className="text-xs text-muted-foreground">Total: {totalStudents} alumno{totalStudents === 1 ? "" : "s"}</p>
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label>Acompañantes por género (opcional)</Label>
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              placeholder="Hombres"
              value={form.companionCountMale}
              onChange={(e) => setForm((p) => ({ ...p, companionCountMale: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="Mujeres"
              value={form.companionCountFemale}
              onChange={(e) => setForm((p) => ({ ...p, companionCountFemale: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="hotel">Hotel (opcional)</Label>
          <Input
            id="hotel"
            placeholder="Hotel"
            value={form.hotel}
            onChange={(e) => setForm((p) => ({ ...p, hotel: e.target.value }))}
          />
        </div>

        {isCustomDestination ? (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="initialLat">Latitud inicial</Label>
              <Input
                id="initialLat"
                type="number"
                placeholder="Latitud inicial"
                value={form.initialLat}
                onChange={(e) => setForm((p) => ({ ...p, initialLat: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="initialLng">Longitud inicial</Label>
              <Input
                id="initialLng"
                type="number"
                placeholder="Longitud inicial"
                value={form.initialLng}
                onChange={(e) => setForm((p) => ({ ...p, initialLng: e.target.value }))}
              />
            </div>
          </>
        ) : destinationId ? (
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Coordenadas iniciales: {form.initialLat}, {form.initialLng}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="parentCode">Código apoderado</Label>
          <div className="flex gap-2">
            <Input
              id="parentCode"
              placeholder="Código apoderado"
              className="flex-1"
              value={form.parentCode}
              onChange={(e) => setForm((p) => ({ ...p, parentCode: e.target.value.toUpperCase() }))}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setForm((p) => ({ ...p, parentCode: generateAccessCode() }))}
            >
              <RefreshCwIcon className="size-4" />
              <span className="sr-only">Generar código</span>
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="monitorCode">Código coordinador</Label>
          <div className="flex gap-2">
            <Input
              id="monitorCode"
              placeholder="Código coordinador"
              className="flex-1"
              value={form.monitorCode}
              onChange={(e) => setForm((p) => ({ ...p, monitorCode: e.target.value.toUpperCase() }))}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setForm((p) => ({ ...p, monitorCode: generateAccessCode() }))}
            >
              <RefreshCwIcon className="size-4" />
              <span className="sr-only">Generar código</span>
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="studentCode">Código alumno</Label>
          <div className="flex gap-2">
            <Input
              id="studentCode"
              placeholder="Código alumno"
              className="flex-1"
              value={form.studentCode}
              onChange={(e) => setForm((p) => ({ ...p, studentCode: e.target.value.toUpperCase() }))}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setForm((p) => ({ ...p, studentCode: generateAccessCode() }))}
            >
              <RefreshCwIcon className="size-4" />
              <span className="sr-only">Generar código</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Puedes generar más códigos de alumno desde la ficha del grupo una vez creado.
          </p>
        </div>
      </form>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </>
  )
}
