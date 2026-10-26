import './load-env'
import { randomBytes } from 'node:crypto'
import { createClerkClient } from '@clerk/backend'
import { AnnouncementType, ItineraryStatus, PrismaClient, Role, TripStatus } from '@prisma/client'
import { chileDateKey, chileMidnightFromKey } from '../lib/dates'

// Account the app stores' reviewers sign in with (Play Console "Acceso a la app", App Store Connect
// "Sign-in information"). It is coordinator and parent of a demo trip, so the reviewer sees both views.
// Re-running it sets a new password and recreates the trip around today, so it stays "in progress"
// for the next review.

const prisma = new PrismaClient()
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })

const SCHOOL_NAME = 'Colegio de Demostración'
const TRIP_NAME = 'Gira de demostración – Revisión de tiendas'
const TOTAL_DAYS = 21
const CURRENT_DAY = 3

function chileDaysFromToday(days: number): Date {
  const [year, month, day] = chileDateKey(new Date()).split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return chileMidnightFromKey(date.toISOString().slice(0, 10))!
}

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000)
}

function dayContent(day: number) {
  if (day === 1) {
    return [
      { time: '08:00', title: 'Salida desde el colegio', location: 'Santiago', description: 'Traslado en bus hacia el sur.' },
      { time: '20:00', title: 'Llegada y check-in', location: 'Hotel Cabañas del Lago, Puerto Varas', description: 'Instalación en el hospedaje.' },
    ]
  }
  if (day % 2 === 0) {
    return [
      { time: '09:30', title: 'Recorrido por el lago Llanquihue', location: 'Puerto Varas', description: 'Paseo guiado por la costanera.', requirementsMessage: 'Llevar ropa de abrigo y bloqueador solar.' },
      { time: '20:00', title: 'Cena grupal', location: 'Hotel Cabañas del Lago, Puerto Varas', description: 'Cena y descanso.' },
    ]
  }
  return [
    { time: '09:00', title: 'Excursión a los Saltos del Petrohué', location: 'Parque Nacional Vicente Pérez Rosales', description: 'Caminata por los senderos del parque.' },
    { time: '19:30', title: 'Tiempo libre', location: 'Puerto Varas', description: 'Actividades recreativas acompañados por los coordinadores.' },
  ]
}

function buildItinerary() {
  let order = 1
  return Array.from({ length: TOTAL_DAYS }, (_, index) => index + 1).flatMap((day) =>
    dayContent(day).map((entry, idx) => ({
      ...entry,
      requirementsMessage: entry.requirementsMessage ?? null,
      dayNumber: day,
      order: order++,
      status:
        day < CURRENT_DAY
          ? ItineraryStatus.COMPLETED
          : day === CURRENT_DAY && idx === 0
            ? ItineraryStatus.IN_PROGRESS
            : ItineraryStatus.PENDING,
    }))
  )
}

async function upsertClerkUser(email: string, password: string): Promise<string> {
  const existing = (await clerk.users.getUserList({ emailAddress: [email] })).data[0]
  if (existing) {
    await clerk.users.updateUser(existing.id, { password, signOutOfOtherSessions: true })
    return existing.id
  }
  const user = await clerk.users.createUser({
    emailAddress: [email],
    password,
    firstName: 'Revisión',
    lastName: 'Tiendas',
  })
  return user.id
}

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: [ENV_FILE=.env.prod] npx tsx scripts/seed-review-account.ts <email>')
    process.exit(1)
  }

  // Base64url, 24 characters: long enough for the 15-character minimum and never in a breach list.
  const password = randomBytes(18).toString('base64url')
  const clerkUserId = await upsertClerkUser(email, password)

  const previous = await prisma.trip.findMany({ where: { name: TRIP_NAME }, select: { id: true, programId: true } })
  for (const trip of previous) {
    await prisma.trip.delete({ where: { id: trip.id } })
    await prisma.program.delete({ where: { id: trip.programId } })
  }

  const school = await prisma.school.upsert({ where: { name: SCHOOL_NAME }, update: {}, create: { name: SCHOOL_NAME } })
  const itinerary = buildItinerary()
  const program = await prisma.program.create({
    data: {
      name: TRIP_NAME,
      description: 'Programa de la gira de demostración para la revisión de las tiendas de apps.',
      items: {
        create: itinerary.map((item) => ({
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

  const trip = await prisma.trip.create({
    data: {
      name: TRIP_NAME,
      destination: 'Puerto Varas, Chile',
      schoolId: school.id,
      startDate: chileDaysFromToday(-(CURRENT_DAY - 1)),
      endDate: chileDaysFromToday(TOTAL_DAYS - CURRENT_DAY),
      status: TripStatus.IN_ACTIVITY,
      totalDays: TOTAL_DAYS,
      studentCount: 30,
      hotel: 'Hotel Cabañas del Lago',
      initialLat: -41.3195,
      initialLng: -72.9856,
      programId: program.id,
      itineraryItems: { create: itinerary },
      announcements: {
        create: [
          {
            title: 'Llegamos a Puerto Varas',
            message: 'El grupo llegó sin novedades y ya está instalado en el hotel.',
            authorName: 'Coordinación Meridiano Cero',
            type: AnnouncementType.ACHIEVEMENT,
            createdAt: minutesAgo(60 * 20),
          },
          {
            title: 'Saltos del Petrohué',
            message: 'Estamos recorriendo el parque. El clima está despejado y todo el grupo está bien.',
            authorName: 'Coordinación Meridiano Cero',
            type: AnnouncementType.INFO,
            createdAt: minutesAgo(30),
          },
        ],
      },
      locationPings: {
        create: [
          { lat: -41.1578, lng: -72.4167, accuracy: 12, createdAt: minutesAgo(40) },
          { lat: -41.1571, lng: -72.4151, accuracy: 9, createdAt: minutesAgo(5) },
        ],
      },
    },
  })

  // Created one at a time so the coordinator view comes first: the app opens the first membership.
  await prisma.tripMembership.create({ data: { clerkUserId, tripId: trip.id, role: Role.MONITOR } })
  await prisma.tripMembership.create({ data: { clerkUserId, tripId: trip.id, role: Role.PARENT } })

  console.log(`Review account ready: ${email} (${clerkUserId})`)
  console.log(`Password: ${password}`)
  console.log(`Trip: ${TRIP_NAME} (${trip.id}), coordinator and parent`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
