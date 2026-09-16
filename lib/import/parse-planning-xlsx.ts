import * as XLSX from 'xlsx'

/**
 * Parses the ops team's "Bulk plataforma meridiano" template into candidate
 * Trip rows. One flat sheet, one row per school group — Colegio and Curso
 * are already separate columns, and Destino is an explicit code (single,
 * like "BRC", or a combo like "PUCBRC" for a multi-stop trip) rather than
 * something to guess from a hotel name.
 */

export type ParsedImportRow = {
  key: string
  sheet: string
  grupo: string
  school: string
  curso: string
  ejecutivo: string
  coordinador: string
  studentCount: number
  studentCountMale?: number
  studentCountFemale?: number
  companionCountMale?: number
  companionCountFemale?: number
  programCode: string
  startDate: string | null
  endDate: string | null
  totalDays: number | null
  hotel: string
  destinationCode: string
  destinationIds: string[] | null
  warnings: string[]
}

export type ParsedImportResult = {
  rows: ParsedImportRow[]
  sheetsProcessed: string[]
  sheetsSkipped: { name: string; reason: string }[]
  programCodes: string[]
}

// Legend codes from the template's "Destino" column. A combo code (e.g. a
// Pucón + Bariloche package) resolves to more than one KNOWN_DESTINATIONS id,
// in visit order — the first becomes the trip's initial leg, the rest become
// extra TripLegs.
const DESTINATION_CODE_MAP: Record<string, string[]> = {
  BR: ['camboriu'],
  BRC: ['bariloche'],
  RN: ['isla-de-pascua'],
  REP: ['republica-dominicana'],
  HH: ['huilo-huilo'],
  PUC: ['sur-de-chile'],
  PUCBRC: ['sur-de-chile', 'bariloche'],
  PVBRC: ['puerto-varas', 'bariloche'],
  HHBRC: ['huilo-huilo', 'bariloche'],
}

function normalize(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

function findColumnIndex(headerRow: unknown[], candidates: string[], exact = false): number {
  for (let i = 0; i < headerRow.length; i++) {
    const norm = normalize(headerRow[i])
    if (!norm) continue
    const isMatch = exact ? candidates.includes(norm) : candidates.some((c) => norm.includes(c))
    if (isMatch) return i
  }
  return -1
}

function parseExcelDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'number' && Number.isFinite(value)) {
    const utcDays = Math.floor(value - 25569)
    const date = new Date(utcDays * 86400 * 1000)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value.trim())
    if (!Number.isNaN(date.getTime())) return date
  }
  return null
}

function resolveDestinationIds(code: string): string[] | null {
  if (!code) return null
  return DESTINATION_CODE_MAP[code.toUpperCase().replace(/\s+/g, '')] ?? null
}

export function parsePlanningWorkbook(buffer: ArrayBuffer): ParsedImportResult {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })

  const rows: ParsedImportRow[] = []
  const sheetsProcessed: string[] = []
  const sheetsSkipped: { name: string; reason: string }[] = []
  const programCodes = new Set<string>()

  for (const sheetName of workbook.SheetNames) {
    const grid = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' }) as unknown[][]

    let headerRowIndex = -1
    for (let i = 0; i < Math.min(grid.length, 6); i++) {
      const norms = grid[i].map(normalize)
      if (norms.includes('colegio') && norms.includes('curso') && norms.includes('programa')) {
        headerRowIndex = i
        break
      }
    }
    if (headerRowIndex === -1) {
      sheetsSkipped.push({ name: sheetName, reason: 'No se encontró una fila de encabezado reconocible.' })
      continue
    }

    const header = grid[headerRowIndex]
    const grupoIdx = findColumnIndex(header, ['numero de grupo', 'grupo'])
    const ejecutivoIdx = findColumnIndex(header, ['ejecutivo'])
    const colegioIdx = findColumnIndex(header, ['colegio'])
    const cursoIdx = findColumnIndex(header, ['curso'])
    const programaIdx = findColumnIndex(header, ['programa'])
    const destinoIdx = findColumnIndex(header, ['destino'])
    const alumFemIdx = findColumnIndex(header, ['alumnos femenino', 'alumno femenino'])
    const alumMascIdx = findColumnIndex(header, ['alumno masculino', 'alumnos masculino'])
    const apodFemIdx = findColumnIndex(header, ['apod femenino'])
    const apodMascIdx = findColumnIndex(header, ['apod masculino'])
    const inIdx = findColumnIndex(header, ['fecha in'])
    const outIdx = findColumnIndex(header, ['fecha out'])
    const hotelIdx = findColumnIndex(header, ['hotel'])
    const coordinadorIdx = findColumnIndex(header, ['coordinador'])

    if ([colegioIdx, cursoIdx, programaIdx, destinoIdx, inIdx, outIdx].some((idx) => idx === -1)) {
      sheetsSkipped.push({
        name: sheetName,
        reason: 'Faltan columnas obligatorias (Colegio, Curso, Programa, Destino, Fecha in o Fecha out).',
      })
      continue
    }

    sheetsProcessed.push(sheetName)

    for (let i = headerRowIndex + 1; i < grid.length; i++) {
      const row = grid[i]
      const school = String(row[colegioIdx] ?? '').trim()
      // Rows without a Colegio are either blank separators or legend/reference
      // rows (the template documents its Destino codes in these same columns).
      if (!school) continue

      const warnings: string[] = []
      const grupo = grupoIdx >= 0 ? String(row[grupoIdx] ?? '').trim() : ''
      const curso = String(row[cursoIdx] ?? '').trim()
      const ejecutivo = ejecutivoIdx >= 0 ? String(row[ejecutivoIdx] ?? '').trim() : ''
      const coordinador = coordinadorIdx >= 0 ? String(row[coordinadorIdx] ?? '').trim() : ''

      const alumFem = alumFemIdx >= 0 ? Number(row[alumFemIdx]) || 0 : 0
      const alumMasc = alumMascIdx >= 0 ? Number(row[alumMascIdx]) || 0 : 0
      const apodFem = apodFemIdx >= 0 ? Number(row[apodFemIdx]) || 0 : 0
      const apodMasc = apodMascIdx >= 0 ? Number(row[apodMascIdx]) || 0 : 0
      const studentCount = alumFem + alumMasc
      if (studentCount <= 0) warnings.push('Sin cantidad de alumnos')

      const programCode = String(row[programaIdx] ?? '').trim()
      if (!programCode) warnings.push('Sin código de programa')
      if (programCode) programCodes.add(programCode)

      const destinationCode = String(row[destinoIdx] ?? '').trim()
      const destinationIds = resolveDestinationIds(destinationCode)
      if (!destinationCode) warnings.push('Sin código de destino')
      else if (!destinationIds) warnings.push(`Código de destino "${destinationCode}" no reconocido — selecciona uno manualmente`)

      const startDate = parseExcelDate(row[inIdx])
      const endDate = parseExcelDate(row[outIdx])
      if (!startDate) warnings.push('Fecha de inicio inválida')
      if (!endDate) warnings.push('Fecha de término inválida')

      let totalDays: number | null = null
      if (startDate && endDate) {
        totalDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1
        if (totalDays < 1) warnings.push('La fecha de término es anterior a la de inicio')
        else if (totalDays > 30) warnings.push('Rango de fechas inusualmente largo — revisar')
      }

      const hotel = hotelIdx >= 0 ? String(row[hotelIdx] ?? '').trim() : ''

      rows.push({
        key: `${sheetName}__${grupo || i}`,
        sheet: sheetName,
        grupo,
        school,
        curso,
        ejecutivo,
        coordinador,
        studentCount,
        studentCountMale: alumMasc || undefined,
        studentCountFemale: alumFem || undefined,
        companionCountMale: apodMasc || undefined,
        companionCountFemale: apodFem || undefined,
        programCode,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
        totalDays,
        hotel,
        destinationCode,
        destinationIds,
        warnings,
      })
    }
  }

  return { rows, sheetsProcessed, sheetsSkipped, programCodes: [...programCodes].sort() }
}
