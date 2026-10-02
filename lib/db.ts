import { PrismaClient } from '@prisma/client'
import { tripDayToday } from '@/lib/dates'

function createPrismaClient() {
  return new PrismaClient().$extends({
    result: {
      trip: {
        // The stored column was never advanced after a trip was created, so every reader (panel,
        // parent view, mobile app) saw "Día 1". It is derived from the dates on every read instead,
        // which also covers trips nested in other queries.
        currentDay: {
          needs: { startDate: true, totalDays: true },
          compute: (trip) => tripDayToday(trip.startDate, trip.totalDays),
        },
      },
    },
  })
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>

const globalForPrisma = globalThis as unknown as { prisma?: ExtendedPrismaClient }

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
