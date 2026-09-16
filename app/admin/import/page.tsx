'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  FileSpreadsheetIcon,
  Loader2Icon,
  SearchIcon,
  UploadIcon,
  XCircleIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { EmptyState } from '@/components/empty-state'
import { FetchError } from '@/components/fetch-error'
import { KNOWN_DESTINATIONS } from '@/lib/destinations'
import type { ParsedImportResult, ParsedImportRow } from '@/lib/import/parse-planning-xlsx'

type ProgramOption = { id: string; name: string }
type CommitResult = { key: string; success: boolean; tripId?: string; error?: string }

type RowState = ParsedImportRow & {
  included: boolean
}

function toDateInputValue(iso: string | null) {
  return iso ? iso.slice(0, 10) : ''
}

function fromDateInputValue(value: string): string | null {
  if (!value) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function destinationLabel(ids: string[]) {
  return ids
    .map((id) => KNOWN_DESTINATIONS.find((d) => d.id === id)?.label)
    .filter(Boolean)
    .join(' → ')
}

export default function AdminImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedImportResult | null>(null)

  const [rows, setRows] = useState<RowState[]>([])
  const [programMapping, setProgramMapping] = useState<Record<string, string>>({})
  const [destinationMapping, setDestinationMapping] = useState<Record<string, string>>({})

  const [programs, setPrograms] = useState<ProgramOption[] | null>(null)
  const [programsError, setProgramsError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<Record<string, CommitResult>>({})

  const loadPrograms = useCallback(async () => {
    setProgramsError(null)
    try {
      const res = await fetch('/api/v1/admin/programs')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPrograms(data.programs)
    } catch {
      setProgramsError('No se pudieron cargar los programas.')
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadPrograms()
    }, 0)
    return () => window.clearTimeout(id)
  }, [loadPrograms])

  // Codes the parser couldn't resolve on its own (unknown to DESTINATION_CODE_MAP) —
  // the admin picks a single fallback destination for each one here.
  const unresolvedDestinationCodes = useMemo(() => {
    const codes = new Set<string>()
    for (const row of rows) {
      if (row.destinationCode && !row.destinationIds) codes.add(row.destinationCode)
    }
    return [...codes].sort()
  }, [rows])

  function resolveDestinationIds(row: RowState): string[] | null {
    if (row.destinationIds) return row.destinationIds
    const fallback = destinationMapping[row.destinationCode]
    return fallback ? [fallback] : null
  }

  async function handleFileSelected(file: File) {
    setParsing(true)
    setParseError(null)
    setResults({})
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/v1/admin/imports/parse', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error?.message ?? 'No se pudo leer el archivo.')
      }
      const data: ParsedImportResult = await res.json()
      setParsed(data)
      setRows(data.rows.map((row) => ({ ...row, included: row.warnings.length === 0 })))
      setProgramMapping({})
      setDestinationMapping({})
    } catch (error) {
      setParsed(null)
      setRows([])
      setParseError(error instanceof Error ? error.message : 'No se pudo leer el archivo.')
    } finally {
      setParsing(false)
    }
  }

  function isRowReady(row: RowState) {
    if (!row.school) return false
    if (row.studentCount <= 0) return false
    if (!row.startDate || !row.endDate) return false
    if (!row.programCode || !programMapping[row.programCode]) return false
    if (!resolveDestinationIds(row)) return false
    return true
  }

  const readyRows = rows.filter((r) => r.included && isRowReady(r))

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter(
      (row) =>
        row.school.toLowerCase().includes(query) ||
        row.salesExecutive.toLowerCase().includes(query) ||
        row.programCode.toLowerCase().includes(query) ||
        row.destinationCode.toLowerCase().includes(query) ||
        row.hotel.toLowerCase().includes(query)
    )
  }, [rows, search])

  function updateRow(key: string, patch: Partial<RowState>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  async function handleImport() {
    if (readyRows.length === 0 || !programs) return
    setSubmitting(true)
    const payload = readyRows.map((row) => {
      const programId = programMapping[row.programCode]
      const destinationIds = resolveDestinationIds(row)!
      const destinations = destinationIds.map((id) => KNOWN_DESTINATIONS.find((d) => d.id === id)!)
      const [primary, ...extra] = destinations
      const programName = programs.find((p) => p.id === programId)?.name
      const year = row.startDate ? new Date(row.startDate).getFullYear() : ''
      const name = [row.school, row.grade, programName, year].filter(Boolean).join(' ')
      return {
        key: row.key,
        name,
        groupNumber: row.groupNumber || undefined,
        grade: row.grade || undefined,
        salesExecutive: row.salesExecutive || undefined,
        school: row.school,
        destination: destinations.map((d) => d.label).join(' → '),
        startDate: row.startDate!,
        endDate: row.endDate!,
        studentCount: row.studentCount,
        studentCountMale: row.studentCountMale,
        studentCountFemale: row.studentCountFemale,
        companionCountMale: row.companionCountMale,
        companionCountFemale: row.companionCountFemale,
        initialLat: primary.lat,
        initialLng: primary.lng,
        hotel: row.hotel || undefined,
        programId,
        legs: extra.length > 0 ? [primary, ...extra].map((d) => ({ label: d.label, lat: d.lat, lng: d.lng })) : undefined,
      }
    })

    try {
      const res = await fetch('/api/v1/admin/imports/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: payload }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error?.message ?? 'No se pudo importar.')
      }
      const data: { results: CommitResult[] } = await res.json()
      const byKey: Record<string, CommitResult> = {}
      let successCount = 0
      for (const result of data.results) {
        byKey[result.key] = result
        if (result.success) successCount++
      }
      setResults(byKey)
      if (successCount === data.results.length) {
        toast.success(`${successCount} grupo${successCount === 1 ? '' : 's'} creado${successCount === 1 ? '' : 's'}.`)
      } else {
        toast.warning(`${successCount} de ${data.results.length} grupos creados. Revisa los errores en la tabla.`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo importar.')
    } finally {
      setSubmitting(false)
    }
  }

  const allProgramsMapped = parsed ? parsed.programCodes.every((code) => programMapping[code]) : false

  return (
    <>
      <SiteHeader title="Importar planificación" subtitle="Crea grupos en bloque desde la planilla de bulk de la plataforma" />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <Card className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <FileSpreadsheetIcon size={18} />
              </span>
              <div>
                <p className="font-semibold">Planilla de bulk (.xlsx)</p>
                <p className="text-sm text-muted-foreground">
                  Columnas: N° de grupo, Ejecutivo, Colegio, Curso, Programa, Destino, alumnos/apoderados, Fecha in/out, Hotel, Coordinador.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleFileSelected(file)
                  e.target.value = ''
                }}
              />
              <Button onClick={() => fileInputRef.current?.click()} disabled={parsing}>
                {parsing ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
                {parsing ? 'Analizando…' : 'Subir archivo'}
              </Button>
            </div>
          </div>
          {parseError ? <FetchError message={parseError} onRetry={() => fileInputRef.current?.click()} /> : null}
          {parsed ? (
            <div className="mt-4 flex flex-col gap-1 text-sm text-muted-foreground">
              <p>
                Hojas procesadas: <span className="text-foreground">{parsed.sheetsProcessed.join(', ') || '—'}</span> ·{' '}
                {rows.length} fila{rows.length === 1 ? '' : 's'} encontrada{rows.length === 1 ? '' : 's'}
              </p>
              {parsed.sheetsSkipped.length > 0 ? (
                <ul className="list-disc pl-5">
                  {parsed.sheetsSkipped.map((s) => (
                    <li key={s.name}>
                      <span className="text-foreground">{s.name}</span> omitida — {s.reason}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </Card>

        {parsed && rows.length > 0 ? (
          <>
            <Card className="p-6">
              <p className="mb-3 font-semibold">Mapeo de programas</p>
              {programsError ? (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-destructive">{programsError}</p>
                  <Button variant="ghost" size="sm" className="h-auto p-0 text-xs underline" onClick={() => void loadPrograms()}>
                    Reintentar
                  </Button>
                </div>
              ) : !programs ? (
                <p className="text-sm text-muted-foreground">Cargando programas…</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {parsed.programCodes.map((code) => (
                    <div key={code} className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">{code}</label>
                      <Select
                        value={programMapping[code] ?? ''}
                        onValueChange={(value) => setProgramMapping((p) => ({ ...p, [code]: value }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Elegir programa…" />
                        </SelectTrigger>
                        <SelectContent>
                          {programs.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {unresolvedDestinationCodes.length > 0 ? (
              <Card className="p-6">
                <p className="mb-1 font-semibold">Códigos de destino sin reconocer</p>
                <p className="mb-3 text-sm text-muted-foreground">
                  Elige un destino de referencia para cada código — no arma giras multi-destino, solo asigna coordenadas
                  iniciales. Si necesitas más de un tramo, crea esa gira desde el formulario normal.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {unresolvedDestinationCodes.map((code) => (
                    <div key={code} className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">{code}</label>
                      <Select
                        value={destinationMapping[code] ?? ''}
                        onValueChange={(value) => setDestinationMapping((p) => ({ ...p, [code]: value }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Elegir destino…" />
                        </SelectTrigger>
                        <SelectContent>
                          {KNOWN_DESTINATIONS.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-xs">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por colegio, ejecutivo, programa o destino…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {readyRows.length} de {rows.length} listas para importar
              </p>
            </div>

            <Card className="overflow-hidden">
              <div className="max-h-128 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Colegio</TableHead>
                      <TableHead>Curso</TableHead>
                      <TableHead>Ejecutivo</TableHead>
                      <TableHead>Alumnos</TableHead>
                      <TableHead>Programa</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Inicio</TableHead>
                      <TableHead>Término</TableHead>
                      <TableHead>Hotel</TableHead>
                      <TableHead>Coordinador</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => {
                      const ready = isRowReady(row)
                      const result = results[row.key]
                      const destinationIds = resolveDestinationIds(row)
                      return (
                        <TableRow key={row.key} className={!ready ? 'opacity-60' : undefined}>
                          <TableCell>
                            <Checkbox
                              checked={row.included}
                              disabled={!ready}
                              onCheckedChange={(checked) => updateRow(row.key, { included: checked === true })}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 min-w-40"
                              value={row.school}
                              onChange={(e) => updateRow(row.key, { school: e.target.value })}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 w-24"
                              value={row.grade}
                              onChange={(e) => updateRow(row.key, { grade: e.target.value })}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 w-28"
                              value={row.salesExecutive}
                              onChange={(e) => updateRow(row.key, { salesExecutive: e.target.value })}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              className="h-8 w-16"
                              value={row.studentCount}
                              onChange={(e) => updateRow(row.key, { studentCount: Number(e.target.value) || 0 })}
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground">{row.programCode || '—'}</TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {destinationIds ? destinationLabel(destinationIds) : `${row.destinationCode || '—'} (sin mapear)`}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              className="h-8 w-36"
                              value={toDateInputValue(row.startDate)}
                              onChange={(e) => updateRow(row.key, { startDate: fromDateInputValue(e.target.value) })}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              className="h-8 w-36"
                              value={toDateInputValue(row.endDate)}
                              onChange={(e) => updateRow(row.key, { endDate: fromDateInputValue(e.target.value) })}
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground">{row.hotel || '—'}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {row.coordinador ? (
                              <Tooltip>
                                <TooltipTrigger>{row.coordinador}</TooltipTrigger>
                                <TooltipContent>
                                  Referencia solo — asigna a esta persona como Monitor desde la ficha del grupo una vez
                                  creado.
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell>
                            {result ? (
                              result.success ? (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <CheckCircle2Icon className="size-4 text-emerald-600" />
                                  </TooltipTrigger>
                                  <TooltipContent>Grupo creado</TooltipContent>
                                </Tooltip>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <XCircleIcon className="size-4 text-destructive" />
                                  </TooltipTrigger>
                                  <TooltipContent>{result.error}</TooltipContent>
                                </Tooltip>
                              )
                            ) : row.warnings.length > 0 ? (
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertTriangleIcon className="size-4 text-amber-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <ul>
                                    {row.warnings.map((w) => (
                                      <li key={w}>{w}</li>
                                    ))}
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button
                size="lg"
                disabled={readyRows.length === 0 || submitting || !allProgramsMapped}
                onClick={() => void handleImport()}
              >
                {submitting ? <Loader2Icon className="animate-spin" /> : null}
                {submitting ? 'Importando…' : `Importar ${readyRows.length} grupo${readyRows.length === 1 ? '' : 's'}`}
              </Button>
            </div>
          </>
        ) : parsed && rows.length === 0 ? (
          <EmptyState
            icon={FileSpreadsheetIcon}
            title="No se encontraron filas de grupos en el archivo."
            description="Revisa que la planilla tenga columnas Colegio, Curso, Programa, Destino, Fecha in y Fecha out."
          />
        ) : null}
      </div>
    </>
  )
}
