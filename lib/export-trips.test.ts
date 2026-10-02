import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import type { TripRow } from '@/components/data-table'
import { tripsToSheetRows } from './export-trips'

const trip = {
  groupNumber: '107',
  name: '4° Medio B – Bariloche 2026',
  school: { name: 'Colegio Ñuñoa' },
  grade: '4°B',
  program: { name: 'BRC 107' },
  destination: 'Bariloche',
  salesExecutive: 'María José',
  monitorNames: ['Ana', 'Luis'],
  status: 'IN_TRANSIT',
  currentDay: 3,
  totalDays: 7,
  studentCount: 32,
  startDate: new Date('2026-10-05T03:00:00.000Z'),
  endDate: new Date('2026-10-11T03:00:00.000Z'),
  hotel: null,
} as unknown as TripRow

describe('tripsToSheetRows', () => {
  it('uses Spanish labels and real numbers instead of enum codes and strings', () => {
    const [header, row] = tripsToSheetRows([trip])
    expect(header[0]).toBe('N° grupo')
    expect(row).toContain('En ruta')
    expect(row).not.toContain('IN_TRANSIT')
    expect(row[header.indexOf('Día actual')]).toBe(3)
    expect(row[header.indexOf('Alumnos')]).toBe(32)
    expect(row[header.indexOf('Coordinadores')]).toBe('Ana, Luis')
  })

  it('round-trips through an .xlsx file with accents intact and dates on the right day', () => {
    const sheet = XLSX.utils.aoa_to_sheet(tripsToSheetRows([trip]))
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, 'Grupos')
    const read = XLSX.read(XLSX.write(book, { type: 'array', bookType: 'xlsx' }))
    const cells = read.Sheets.Grupos

    expect(cells.C2.v).toBe('Colegio Ñuñoa')
    // A whole serial (no drift before midnight) formatted as a date: what Excel displays.
    expect(cells.M2.v).toBe(46300)
    expect(XLSX.SSF.format('dd-mm-yyyy', cells.M2.v)).toBe('05-10-2026')
    expect(XLSX.SSF.format('dd-mm-yyyy', cells.N2.v)).toBe('11-10-2026')
  })
})
