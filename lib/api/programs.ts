import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'

/**
 * Copies a Program's items onto a trip's itinerary (one-shot, not a live sync —
 * editing the Program afterwards never rewrites itinerary items already copied).
 */
export async function applyProgramToTrip(tripId: string, programId: string) {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: { items: { orderBy: [{ dayNumber: 'asc' }, { order: 'asc' }] } },
  })
  if (!program) throw new ApiError('NOT_FOUND', 'No se encontró el programa.')
  if (program.items.length === 0) throw new ApiError('VALIDATION_ERROR', 'Este programa aún no tiene actividades.')

  const last = await prisma.itineraryItem.findFirst({ where: { tripId }, orderBy: { order: 'desc' } })
  let nextOrder = (last?.order ?? -1) + 1

  const items = await Promise.all(
    program.items.map((item) =>
      prisma.itineraryItem.create({
        data: {
          tripId,
          dayNumber: item.dayNumber,
          time: item.time,
          title: item.title,
          location: item.location,
          description: item.description,
          requirementsMessage: item.requirementsMessage,
          order: nextOrder++,
        },
      })
    )
  )

  return items
}

/**
 * Creates "<name> (copia)" with the same description and activities, in one write so a failure never
 * leaves a half-copied program behind. Trips stay on the original: assigning them is a separate choice.
 */
export async function duplicateProgram(programId: string) {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: { items: { orderBy: [{ dayNumber: 'asc' }, { order: 'asc' }] } },
  })
  if (!program) throw new ApiError('NOT_FOUND', 'No se encontró el programa.')

  return prisma.program.create({
    data: {
      name: `${program.name} (copia)`,
      description: program.description,
      items: {
        create: program.items.map((item) => ({
          dayNumber: item.dayNumber,
          time: item.time,
          title: item.title,
          location: item.location,
          description: item.description,
          requirementsMessage: item.requirementsMessage,
          order: item.order,
        })),
      },
    },
  })
}
