import type { TripRow } from '@/components/data-table'
import { chileDateKey } from '@/lib/dates'
import { tripStatusLabels } from '@/lib/labels'

/** An Excel date cell: a whole day serial with a date format. */
type DateCell = { t: 'n'; v: number; z: string }
type Cell = string | number | DateCell

/**
 * The Chile calendar date as an Excel serial (days since 1899-12-30). Passing Date objects to the
 * xlsx library instead drifted a few seconds before midnight, so Excel showed the previous day.
 */
function excelDate(date: Date | string): DateCell {
  const [year, month, day] = chileDateKey(new Date(date)).split('-').map(Number)
  return { t: 'n', v: Date.UTC(year, month - 1, day) / 86400000 + 25569, z: 'dd-mm-yyyy' }
}

const HEADER = [
  'N° grupo',
  'Nombre',
  'Colegio',
  'Curso',
  'Programa',
  'Destino',
  'Ejecutivo',
  'Coordinadores',
  'Estado',
  'Día actual',
  'Días',
  'Alumnos',
  'Inicio',
  'Término',
  'Hotel',
]

/** Header + one row per trip, with real numbers and dates so Excel can sort and filter them. */
export function tripsToSheetRows(trips: TripRow[]): Cell[][] {
  return [
    HEADER,
    ...trips.map((trip) => [
      trip.groupNumber ?? '',
      trip.name,
      trip.school.name,
      trip.grade ?? '',
      trip.program.name,
      trip.destination,
      trip.salesExecutive ?? '',
      trip.monitorNames.join(', '),
      tripStatusLabels[trip.status],
      trip.currentDay,
      trip.totalDays,
      trip.studentCount,
      excelDate(trip.startDate),
      excelDate(trip.endDate),
      trip.hotel ?? '',
    ]),
  ]
}

/**
 * Downloads the trips as .xlsx. Replaces a CSV that Excel in Spanish opened in a single column
 * (it expects ";") with garbled accents (no BOM). The xlsx library is loaded only on click.
 */
export async function downloadTripsXlsx(trips: TripRow[]) {
  const XLSX = await import('xlsx')
  const sheet = XLSX.utils.aoa_to_sheet(tripsToSheetRows(trips))
  sheet['!cols'] = HEADER.map((title) => ({ wch: Math.max(title.length + 2, title === 'Nombre' ? 40 : 14) }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Grupos')
  XLSX.writeFile(workbook, `grupos-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
