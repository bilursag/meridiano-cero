import { NextResponse } from 'next/server'
import { z } from 'zod'
import { del } from '@vercel/blob'
import { differenceInCalendarDays } from 'date-fns'
import { TripStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { requireAdmin, requireTripAccess } from '@/lib/api/require-role'
import { withApiHandler } from '@/lib/api/handler'
import { notifyInBackground, notifyTripStatusChanged } from '@/lib/notifications'
import { findOrCreateSchool } from '@/lib/api/trips'

export const GET = withApiHandler<{ tripId: string }>(async (_request, { params }) => {
  const { tripId } = await params
  await requireTripAccess(tripId)

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { school: { select: { name: true } }, legs: { orderBy: { order: 'asc' } } },
  })
  if (!trip) throw new ApiError('NOT_FOUND', 'No se encontró el grupo.')

  return NextResponse.json({ trip })
})

const legSchema = z.object({
  label: z.string().trim().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})
const optionalText = z.string().trim().min(1).nullable().optional()
const optionalCount = z.number().int().nonnegative().nullable().optional()

const patchSchema = z.object({
  status: z.enum(TripStatus).optional(),
  name: z.string().trim().min(1).optional(),
  destination: z.string().trim().min(1).optional(),
  startDate: z.iso.datetime().optional(),
  endDate: z.iso.datetime().optional(),
  studentCount: z.number().int().nonnegative().optional(),
  hotel: optionalText,
  groupNumber: optionalText,
  grade: optionalText,
  salesExecutive: optionalText,
  school: z.string().trim().min(1).optional(),
  programId: z.string().trim().min(1).optional(),
  studentCountMale: optionalCount,
  studentCountFemale: optionalCount,
  companionCountMale: optionalCount,
  companionCountFemale: optionalCount,
  initialLat: z.number().min(-90).max(90).optional(),
  initialLng: z.number().min(-180).max(180).optional(),
  // Replaces every leg: [] makes the trip single-destination again.
  legs: z.array(legSchema).optional(),
})

export const PATCH = withApiHandler<{ tripId: string }>(async (request, { params }) => {
  const { tripId } = await params
  const { role } = await requireTripAccess(tripId)

  const json = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', 'Los cambios del grupo no son válidos.')

  const { status, startDate, endDate, school: schoolName, programId, legs, ...detailFields } = parsed.data
  const hasDetailFields =
    startDate !== undefined ||
    endDate !== undefined ||
    schoolName !== undefined ||
    programId !== undefined ||
    legs !== undefined ||
    Object.keys(detailFields).length > 0

  if (hasDetailFields && role !== 'ADMIN') {
    throw new ApiError('FORBIDDEN', 'Solo un administrador puede editar los datos del grupo.')
  }
  if (status !== undefined && role !== 'ADMIN' && role !== 'MONITOR') {
    throw new ApiError('FORBIDDEN', 'Solo coordinadores y administradores pueden cambiar el estado del grupo.')
  }
  if (!hasDetailFields && status === undefined) {
    throw new ApiError('VALIDATION_ERROR', 'No hay cambios para guardar.')
  }

  const existing = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { status: true, startDate: true, endDate: true },
  })
  if (!existing) throw new ApiError('NOT_FOUND', 'No se encontró el grupo.')

  if (status !== undefined && existing.status === 'FINISHED' && status !== 'FINISHED') {
    throw new ApiError('VALIDATION_ERROR', 'Un grupo finalizado no puede cambiar de estado.')
  }

  let totalDays: number | undefined
  if (startDate !== undefined || endDate !== undefined) {
    const effectiveStart = startDate !== undefined ? new Date(startDate) : existing.startDate
    const effectiveEnd = endDate !== undefined ? new Date(endDate) : existing.endDate
    if (effectiveEnd < effectiveStart) {
      throw new ApiError('VALIDATION_ERROR', 'La fecha de término debe ser igual o posterior a la de inicio.')
    }
    totalDays = differenceInCalendarDays(effectiveEnd, effectiveStart) + 1
    const lastUsedDay = await prisma.itineraryItem.aggregate({ where: { tripId }, _max: { dayNumber: true } })
    if ((lastUsedDay._max.dayNumber ?? 0) > totalDays) {
      throw new ApiError(
        'VALIDATION_ERROR',
        `El itinerario tiene actividades hasta el día ${lastUsedDay._max.dayNumber}. Muévelas o elimínalas antes de acortar el grupo a ${totalDays} ${totalDays === 1 ? 'día' : 'días'}.`
      )
    }
  }

  if (programId !== undefined && !(await prisma.program.findUnique({ where: { id: programId }, select: { id: true } }))) {
    throw new ApiError('VALIDATION_ERROR', 'No se encontró el programa.')
  }
  const school = schoolName !== undefined ? await findOrCreateSchool(schoolName) : undefined

  // One nested write: the legs are replaced atomically with the rest of the update.
  const trip = await prisma.trip.update({
    where: { id: tripId },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...detailFields,
      ...(startDate !== undefined ? { startDate: new Date(startDate) } : {}),
      ...(endDate !== undefined ? { endDate: new Date(endDate) } : {}),
      ...(totalDays !== undefined ? { totalDays } : {}),
      ...(school ? { schoolId: school.id } : {}),
      ...(programId !== undefined ? { programId } : {}),
      ...(legs !== undefined
        ? { legs: { deleteMany: {}, create: legs.map((leg, index) => ({ ...leg, order: index })) } }
        : {}),
    },
    include: { school: { select: { name: true } }, legs: { orderBy: { order: 'asc' } } },
  })

  if (role === 'MONITOR' && status !== undefined && status !== existing.status) {
    notifyInBackground(() => notifyTripStatusChanged(trip, status))
  }

  return NextResponse.json({ trip })
})

export const DELETE = withApiHandler<{ tripId: string }>(async (_request, { params }) => {
  await requireAdmin()
  const { tripId } = await params

  const trip = await prisma.trip.findUnique({ where: { id: tripId } })
  if (!trip) throw new ApiError('NOT_FOUND', 'No se encontró el grupo.')

  const [itineraryPhotos, announcementPhotos] = await Promise.all([
    prisma.itineraryItem.findMany({ where: { tripId, photoUrl: { not: null } }, select: { photoUrl: true } }),
    prisma.announcement.findMany({ where: { tripId, photoUrl: { not: null } }, select: { photoUrl: true } }),
  ])
  await Promise.all(
    [...itineraryPhotos, ...announcementPhotos].map((row) => del(row.photoUrl!).catch(() => {}))
  )

  await prisma.trip.delete({ where: { id: tripId } })

  return NextResponse.json({ ok: true })
})
