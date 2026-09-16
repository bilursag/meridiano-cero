import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { parsePlanningWorkbook } from './parse-planning-xlsx'

const HEADER = [
  'Numero de grupo',
  'ejecutivo',
  'colegio',
  'curso',
  'programa',
  'Destino',
  'alumnos femenino',
  'Alumno masculino',
  'Apod femenino',
  'Apod Masculino',
  'Fecha in',
  'fecha out ',
  'hotel',
  'coordinador ',
]

function buildWorkbook(sheets: Record<string, unknown[][]>): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  for (const [name, rows] of Object.entries(sheets)) {
    const sheet = XLSX.utils.aoa_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, sheet, name)
  }
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

function dataRow(overrides: Partial<Record<string, unknown>> = {}) {
  const defaults = {
    grupo: 1,
    ejecutivo: 'Jmella',
    colegio: 'Alicante de Valle',
    curso: '3ºF',
    programa: 'BRC-108',
    destino: 'BRC',
    alumFem: 13,
    alumMasc: 13,
    apodFem: 2,
    apodMasc: 1,
    in: new Date(2026, 11, 3),
    out: new Date(2026, 11, 6),
    hotel: 'interlaken',
    coordinador: 'Pablo Soto',
  }
  const v = { ...defaults, ...overrides }
  return [v.grupo, v.ejecutivo, v.colegio, v.curso, v.programa, v.destino, v.alumFem, v.alumMasc, v.apodFem, v.apodMasc, v.in, v.out, v.hotel, v.coordinador]
}

describe('parsePlanningWorkbook', () => {
  it('parses a clean row with all fields resolved', () => {
    const buffer = buildWorkbook({ 'Hoja 1': [HEADER, dataRow()] })

    const result = parsePlanningWorkbook(buffer)

    expect(result.sheetsProcessed).toEqual(['Hoja 1'])
    expect(result.sheetsSkipped).toEqual([])
    expect(result.rows).toHaveLength(1)

    const row = result.rows[0]
    expect(row.school).toBe('Alicante de Valle')
    expect(row.grade).toBe('3ºF')
    expect(row.salesExecutive).toBe('Jmella')
    expect(row.coordinador).toBe('Pablo Soto')
    expect(row.studentCount).toBe(26)
    expect(row.studentCountFemale).toBe(13)
    expect(row.studentCountMale).toBe(13)
    expect(row.companionCountFemale).toBe(2)
    expect(row.companionCountMale).toBe(1)
    expect(row.programCode).toBe('BRC-108')
    expect(row.destinationCode).toBe('BRC')
    expect(row.destinationIds).toEqual(['bariloche'])
    expect(row.hotel).toBe('interlaken')
    expect(row.totalDays).toBe(4)
    expect(row.warnings).toEqual([])
    expect(result.programCodes).toEqual(['BRC-108'])
  })

  it('skips legend/reference rows that have no Colegio', () => {
    const buffer = buildWorkbook({
      'Hoja 1': [
        HEADER,
        ['', '', '', '', 'BRC-108', 'BR=Camboriu (Agregar coordenadas de ciudad)', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', 'BRC=Bariloche', '', '', '', '', '', '', '', ''],
        dataRow(),
      ],
    })

    const result = parsePlanningWorkbook(buffer)
    expect(result.rows).toHaveLength(1)
  })

  it('skips a sheet with no recognizable header', () => {
    const buffer = buildWorkbook({ Notas: [['solo', 'texto', 'suelto']] })

    const result = parsePlanningWorkbook(buffer)
    expect(result.sheetsProcessed).toEqual([])
    expect(result.sheetsSkipped).toEqual([{ name: 'Notas', reason: 'No se encontró una fila de encabezado reconocible.' }])
  })

  it('skips a sheet missing required columns even if it has Colegio/Curso/Programa', () => {
    const buffer = buildWorkbook({ Incompleta: [['colegio', 'curso', 'programa'], ['Escuela X', '3A', 'BRC-108']] })

    const result = parsePlanningWorkbook(buffer)
    expect(result.sheetsSkipped).toEqual([
      {
        name: 'Incompleta',
        reason: 'Faltan columnas obligatorias (Colegio, Curso, Programa, Destino, Fecha in o Fecha out).',
      },
    ])
  })

  describe('student count resolution', () => {
    it('sums female + male students directly (no N° PAX fallback in this template)', () => {
      const buffer = buildWorkbook({ 'Hoja 1': [HEADER, dataRow({ alumFem: 10, alumMasc: 15 })] })
      const row = parsePlanningWorkbook(buffer).rows[0]
      expect(row.studentCount).toBe(25)
    })

    it('warns when there is no student count at all', () => {
      const buffer = buildWorkbook({ 'Hoja 1': [HEADER, dataRow({ alumFem: '', alumMasc: '' })] })
      const row = parsePlanningWorkbook(buffer).rows[0]
      expect(row.studentCount).toBe(0)
      expect(row.warnings).toContain('Sin cantidad de alumnos')
    })
  })

  describe('dates', () => {
    it('converts a raw Excel serial number (no date formatting) to the right calendar date', () => {
      const buffer = buildWorkbook({ 'Hoja 1': [HEADER, dataRow({ in: 45992, out: 46363 })] })
      const row = parsePlanningWorkbook(buffer).rows[0]
      expect(row.startDate?.slice(0, 10)).toBe('2025-12-01')
    })

    it('warns when the date range is unusually long', () => {
      const buffer = buildWorkbook({ 'Hoja 1': [HEADER, dataRow({ in: 45992, out: 46363 })] })
      const row = parsePlanningWorkbook(buffer).rows[0]
      expect(row.totalDays).toBeGreaterThan(30)
      expect(row.warnings).toContain('Rango de fechas inusualmente largo — revisar')
    })

    it('warns when dates are missing', () => {
      const buffer = buildWorkbook({ 'Hoja 1': [HEADER, dataRow({ in: '', out: '' })] })
      const row = parsePlanningWorkbook(buffer).rows[0]
      expect(row.startDate).toBeNull()
      expect(row.endDate).toBeNull()
      expect(row.warnings).toContain('Fecha de inicio inválida')
      expect(row.warnings).toContain('Fecha de término inválida')
    })
  })

  describe('destination code resolution', () => {
    it.each([
      ['BR', ['camboriu']],
      ['BRC', ['bariloche']],
      ['RN', ['isla-de-pascua']],
      ['REP', ['republica-dominicana']],
      ['HH', ['huilo-huilo']],
      ['PUC', ['sur-de-chile']],
      ['PUCBRC', ['sur-de-chile', 'bariloche']],
      ['PVBRC', ['puerto-varas', 'bariloche']],
      ['HHBRC', ['huilo-huilo', 'bariloche']],
    ])('resolves code "%s" to %j', (code, expectedIds) => {
      const buffer = buildWorkbook({ 'Hoja 1': [HEADER, dataRow({ destino: code })] })
      const row = parsePlanningWorkbook(buffer).rows[0]
      expect(row.destinationIds).toEqual(expectedIds)
      expect(row.warnings.some((w) => w.includes('no reconocido'))).toBe(false)
    })

    it('is case-insensitive on the destination code', () => {
      const buffer = buildWorkbook({ 'Hoja 1': [HEADER, dataRow({ destino: 'brc' })] })
      const row = parsePlanningWorkbook(buffer).rows[0]
      expect(row.destinationIds).toEqual(['bariloche'])
    })

    it('warns and leaves destinationIds null for an unrecognized code', () => {
      const buffer = buildWorkbook({ 'Hoja 1': [HEADER, dataRow({ destino: 'ZZZ' })] })
      const row = parsePlanningWorkbook(buffer).rows[0]
      expect(row.destinationIds).toBeNull()
      expect(row.warnings).toContain('Código de destino "ZZZ" no reconocido — selecciona uno manualmente')
    })

    it('warns when the destination code is blank', () => {
      const buffer = buildWorkbook({ 'Hoja 1': [HEADER, dataRow({ destino: '' })] })
      const row = parsePlanningWorkbook(buffer).rows[0]
      expect(row.warnings).toContain('Sin código de destino')
    })
  })

  it('collects and sorts unique program codes', () => {
    const buffer = buildWorkbook({
      'Hoja 1': [HEADER, dataRow({ grupo: 1, programa: 'BRC-112E' }), dataRow({ grupo: 2, programa: 'BRC-108' })],
    })
    const result = parsePlanningWorkbook(buffer)
    expect(result.programCodes).toEqual(['BRC-108', 'BRC-112E'])
  })
})
