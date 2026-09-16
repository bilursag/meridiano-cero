import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'
import { ApiError } from '@/lib/api/errors'
import { createTrip } from '@/lib/api/trips'
import { generateAccessCode } from '@/lib/generate-code'

const rowSchema = z
  .object({
    key: z.string().trim().min(1),
    name: z.string().trim().min(1),
    groupNumber: z.string().trim().min(1).optional(),
    grade: z.string().trim().min(1).optional(),
    salesExecutive: z.string().trim().min(1).optional(),
    school: z.string().trim().min(1),
    destination: z.string().trim().min(1),
    startDate: z.iso.datetime(),
    endDate: z.iso.datetime(),
    studentCount: z.number().int().nonnegative(),
    studentCountMale: z.number().int().nonnegative().optional(),
    studentCountFemale: z.number().int().nonnegative().optional(),
    companionCountMale: z.number().int().nonnegative().optional(),
    companionCountFemale: z.number().int().nonnegative().optional(),
    initialLat: z.number().min(-90).max(90),
    initialLng: z.number().min(-180).max(180),
    hotel: z.string().trim().min(1).optional(),
    programId: z.string().trim().min(1),
    legs: z
      .array(
        z.object({
          label: z.string().trim().min(1),
          lat: z.number().min(-90).max(90),
          lng: z.number().min(-180).max(180),
        })
      )
      .optional(),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'endDate must be on or after startDate.',
    path: ['endDate'],
  })

const bodySchema = z.object({ rows: z.array(rowSchema).min(1) })

export const POST = withApiHandler(async (request) => {
  await requireAdmin()

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Missing or invalid import rows.')

  const results: { key: string; success: boolean; tripId?: string; error?: string }[] = []

  for (const { key, ...row } of parsed.data.rows) {
    try {
      const trip = await createTrip({
        ...row,
        startDate: new Date(row.startDate),
        endDate: new Date(row.endDate),
        parentCode: generateAccessCode(),
        monitorCode: generateAccessCode(),
        studentCode: generateAccessCode(),
      })
      results.push({ key, success: true, tripId: trip.id })
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo crear el grupo.'
      results.push({ key, success: false, error: message })
    }
  }

  return NextResponse.json({ results })
})
