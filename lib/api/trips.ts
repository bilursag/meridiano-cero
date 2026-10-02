import { Role } from '@prisma/client'
import { differenceInCalendarDays } from 'date-fns'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'
import { applyProgramToTrip } from '@/lib/api/programs'

export type TripCreateInput = {
  name: string
  groupNumber?: string
  grade?: string
  salesExecutive?: string
  school: string
  destination: string
  startDate: Date
  endDate: Date
  studentCount: number
  studentCountMale?: number
  studentCountFemale?: number
  companionCountMale?: number
  companionCountFemale?: number
  initialLat: number
  initialLng: number
  parentCode: string
  monitorCode: string
  studentCode: string
  programId: string
  hotel?: string
  legs?: { label: string; lat: number; lng: number }[]
}

/** Reuses a school whose name matches ignoring case, so retyping it does not create a duplicate. */
export async function findOrCreateSchool(name: string) {
  return (
    (await prisma.school.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })) ??
    (await prisma.school.create({ data: { name } }))
  )
}

/** Shared by the single "Nuevo grupo" form and the bulk Excel importer. */
export async function createTrip(input: TripCreateInput) {
  const { school: schoolName, parentCode, monitorCode, studentCode, programId, legs, startDate, endDate, ...tripData } =
    input

  const program = await prisma.program.findUnique({ where: { id: programId } })
  if (!program) throw new ApiError('VALIDATION_ERROR', 'No se encontró el programa.')

  const school = await findOrCreateSchool(schoolName)

  const totalDays = differenceInCalendarDays(endDate, startDate) + 1

  const trip = await prisma.trip.create({
    data: {
      ...tripData,
      startDate,
      endDate,
      totalDays,
      schoolId: school.id,
      programId,
      accessCodes: {
        create: [
          { code: parentCode.toUpperCase(), role: Role.PARENT },
          { code: monitorCode.toUpperCase(), role: Role.MONITOR },
          { code: studentCode.toUpperCase(), role: Role.STUDENT },
        ],
      },
      ...(legs && legs.length > 0
        ? { legs: { create: legs.map((leg, index) => ({ ...leg, order: index })) } }
        : {}),
    },
  })

  await applyProgramToTrip(trip.id, programId)

  return trip
}
