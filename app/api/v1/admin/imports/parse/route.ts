import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'
import { ApiError } from '@/lib/api/errors'
import { parsePlanningWorkbook } from '@/lib/import/parse-planning-xlsx'

const MAX_FILE_SIZE = 15 * 1024 * 1024

export const POST = withApiHandler(async (request) => {
  await requireAdmin()

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')
  if (!(file instanceof File)) throw new ApiError('VALIDATION_ERROR', 'Se requiere un archivo .xlsx.')
  if (file.size > MAX_FILE_SIZE) throw new ApiError('VALIDATION_ERROR', 'El archivo debe pesar 15MB o menos.')

  const buffer = await file.arrayBuffer()
  const result = parsePlanningWorkbook(buffer)

  return NextResponse.json(result)
})
