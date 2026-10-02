import { z } from 'zod'
import { prisma } from '@/lib/db'
import { ApiError } from '@/lib/api/errors'

export async function findItineraryItem(tripId: string, itemId: string) {
  const item = await prisma.itineraryItem.findUnique({ where: { id: itemId } })
  if (!item || item.tripId !== tripId) throw new ApiError('NOT_FOUND', 'Itinerary item not found.')
  return item
}

/** Body for saving a drag-and-drop result in one request: the new day, position and time of each moved activity. */
export const dayReorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        dayNumber: z.number().int().min(1),
        order: z.number().int().nonnegative(),
        time: z.string().trim().min(1),
      })
    )
    .min(1)
    .max(500),
})
