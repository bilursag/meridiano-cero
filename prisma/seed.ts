import { PrismaClient, Role, TripStatus, ItineraryStatus, AnnouncementType } from '@prisma/client'

const prisma = new PrismaClient()

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000)
}

async function main() {
  await prisma.locationPing.deleteMany()
  await prisma.announcement.deleteMany()
  await prisma.itineraryItem.deleteMany()
  await prisma.tripMembership.deleteMany()
  await prisma.accessCode.deleteMany()
  await prisma.trip.deleteMany()
  await prisma.school.deleteMany()

  const schools = await Promise.all([
    prisma.school.create({ data: { name: 'Colegio San Martín de Tours' } }),
    prisma.school.create({ data: { name: 'Colegio Santa Teresa de los Andes' } }),
    prisma.school.create({ data: { name: 'Colegio Inglés de Talca' } }),
    prisma.school.create({ data: { name: 'Colegio Los Andes' } }),
    prisma.school.create({ data: { name: 'Colegio Sagrados Corazones' } }),
  ])
  const [sanMartin, santaTeresa, ingles, losAndes, sagradosCorazones] = schools

  const trips = await Promise.all([
    prisma.trip.create({
      data: {
        name: '4° Medio B – Bariloche 2026',
        destination: 'Bariloche, Argentina',
        schoolId: sanMartin.id,
        startDate: new Date('2026-06-16'),
        endDate: new Date('2026-06-22'),
        status: TripStatus.IN_TRANSIT,
        currentDay: 3,
        totalDays: 7,
        studentCount: 34,
        initialLat: -41.1335,
        initialLng: -71.3103,
        accessCodes: {
          create: [
            { code: 'BAR-2026', role: Role.PARENT },
            { code: 'MON-2026', role: Role.MONITOR },
          ],
        },
        itineraryItems: {
          create: [
            {
              time: '07:00',
              title: 'Desayuno en hotel',
              location: 'Hotel Patagonia, Bariloche',
              description: 'Desayuno buffet incluido. Hora de salida: 08:45.',
              status: ItineraryStatus.COMPLETED,
              order: 1,
            },
            {
              time: '09:00',
              title: 'Visita Bosque de Arrayanes',
              location: 'Parque Nac. Nahuel Huapi',
              description: 'Caminata guiada por el bosque de arrayanes. Duración: 2 horas aprox.',
              status: ItineraryStatus.COMPLETED,
              order: 2,
            },
            {
              time: '12:30',
              title: 'Almuerzo',
              location: 'Restaurante El Viejo Munich',
              description: 'Almuerzo en grupo con menú cerrado.',
              status: ItineraryStatus.COMPLETED,
              order: 3,
            },
            {
              time: '14:30',
              title: 'Excursión en lancha',
              location: 'Lago Nahuel Huapi',
              description: 'Paseo en lancha con guía especializado. Duración: 2 horas.',
              status: ItineraryStatus.IN_PROGRESS,
              order: 4,
            },
            {
              time: '18:00',
              title: 'Tiempo libre – Centro Cívico',
              location: 'Centro Cívico, Bariloche',
              description: 'Tiempo libre. Punto de encuentro a las 19:45 en la plaza.',
              status: ItineraryStatus.PENDING,
              order: 5,
            },
            {
              time: '20:30',
              title: 'Cena en hotel',
              location: 'Hotel Patagonia, Bariloche',
              description: 'Cena en el comedor del hotel.',
              status: ItineraryStatus.PENDING,
              order: 6,
            },
          ],
        },
        announcements: {
          create: [
            {
              title: '¡Llegamos a Bariloche!',
              message:
                'Después de un vuelo tranquilo desde Santiago, llegamos al hotel sin ninguna novedad. Todos los alumnos están bien. Esta noche cena de bienvenida y descanso. ¡La gira comenzó!',
              authorName: 'Prof. Carolina Herrera',
              type: AnnouncementType.ACHIEVEMENT,
              createdAt: minutesAgo(60 * 30),
            },
            {
              title: 'Cambio menor en itinerario',
              message:
                'La visita al Cerro Campanario del día de mañana se adelanta 30 minutos (salida 09:00 en vez de 09:30). Se ajustó el almuerzo en consecuencia.',
              authorName: 'Coordinación',
              type: AnnouncementType.ALERT,
              createdAt: minutesAgo(60 * 8),
            },
            {
              title: 'En la lancha – Todo bien',
              message:
                'Embarcamos hace 20 minutos. El tiempo está perfecto y todos están disfrutando el lago Nahuel Huapi. ¡Vistas increíbles desde el agua!',
              authorName: 'Prof. Carolina Herrera',
              type: AnnouncementType.INFO,
              createdAt: minutesAgo(25),
            },
          ],
        },
        locationPings: {
          create: [
            { lat: -41.0699, lng: -71.2853, accuracy: 12, createdAt: minutesAgo(40) },
            { lat: -41.0668, lng: -71.2901, accuracy: 9, createdAt: minutesAgo(6) },
          ],
        },
      },
    }),

    prisma.trip.create({
      data: {
        name: '3° Medio A – San Pedro de Atacama 2026',
        destination: 'San Pedro de Atacama, Chile',
        schoolId: santaTeresa.id,
        startDate: new Date('2026-06-18'),
        endDate: new Date('2026-06-23'),
        status: TripStatus.IN_ACTIVITY,
        currentDay: 2,
        totalDays: 5,
        studentCount: 28,
        initialLat: -22.9098,
        initialLng: -68.1997,
        accessCodes: {
          create: [
            { code: 'ATA-2026', role: Role.PARENT },
            { code: 'MON-ATA', role: Role.MONITOR },
          ],
        },
        itineraryItems: {
          create: [
            {
              time: '06:30',
              title: 'Desayuno en hostal',
              location: 'Hostal Tulor, San Pedro de Atacama',
              description: 'Desayuno temprano para aprovechar el día.',
              status: ItineraryStatus.COMPLETED,
              order: 1,
            },
            {
              time: '07:30',
              title: 'Salida a Valle de la Luna',
              location: 'Valle de la Luna',
              description: 'Recorrido guiado por formaciones rocosas y miradores.',
              status: ItineraryStatus.COMPLETED,
              order: 2,
            },
            {
              time: '11:00',
              title: 'Caminata en Valle Arcoíris',
              location: 'Valle Arcoíris',
              description: 'Caminata moderada, llevar bastante agua.',
              status: ItineraryStatus.IN_PROGRESS,
              order: 3,
            },
            {
              time: '14:00',
              title: 'Almuerzo típico',
              location: 'San Pedro de Atacama',
              description: 'Almuerzo en restaurante local con menú típico.',
              status: ItineraryStatus.PENDING,
              order: 4,
            },
            {
              time: '16:30',
              title: 'Observación astronómica',
              location: 'Observatorio SPACE',
              description: 'Charla y observación con telescopios. Abrigo necesario.',
              status: ItineraryStatus.PENDING,
              order: 5,
            },
            {
              time: '21:00',
              title: 'Cena y descanso',
              location: 'Hostal Tulor',
              description: 'Cena liviana y descanso para el día siguiente.',
              status: ItineraryStatus.PENDING,
              order: 6,
            },
          ],
        },
        announcements: {
          create: [
            {
              title: 'Llegada sin novedades',
              message:
                'Llegamos a San Pedro de Atacama después de un viaje largo pero tranquilo. Todos los alumnos están bien y con muchas ganas de explorar el desierto.',
              authorName: 'Prof. Ignacio Reyes',
              type: AnnouncementType.ACHIEVEMENT,
              createdAt: minutesAgo(60 * 20),
            },
            {
              title: 'En camino al Valle de la Luna',
              message: 'Vamos en el bus rumbo al Valle de la Luna. Clima despejado y muy buena visibilidad.',
              authorName: 'Prof. Ignacio Reyes',
              type: AnnouncementType.INFO,
              createdAt: minutesAgo(60 * 4),
            },
            {
              title: 'Recomendación: hidratación y protector solar',
              message:
                'El sol del desierto es intenso al mediodía. Recordamos a las familias que enviamos a los alumnos con suficiente agua y protector solar; el equipo está reforzando la hidratación en cada parada.',
              authorName: 'Coordinación',
              type: AnnouncementType.ALERT,
              createdAt: minutesAgo(45),
            },
          ],
        },
        locationPings: {
          create: [
            { lat: -22.9192, lng: -68.2883, accuracy: 15, createdAt: minutesAgo(35) },
            { lat: -22.9201, lng: -68.2912, accuracy: 11, createdAt: minutesAgo(4) },
          ],
        },
      },
    }),

    prisma.trip.create({
      data: {
        name: '2° Medio C – Valparaíso y Viña del Mar 2026',
        destination: 'Valparaíso, Chile',
        schoolId: ingles.id,
        startDate: new Date('2026-06-17'),
        endDate: new Date('2026-06-20'),
        status: TripStatus.RESTING,
        currentDay: 3,
        totalDays: 4,
        studentCount: 32,
        initialLat: -33.0472,
        initialLng: -71.6127,
        accessCodes: {
          create: [
            { code: 'VAL-2026', role: Role.PARENT },
            { code: 'MON-VAL', role: Role.MONITOR },
          ],
        },
        itineraryItems: {
          create: [
            {
              time: '09:00',
              title: 'Tour por los cerros',
              location: 'Cerro Alegre, Valparaíso',
              description: 'Recorrido a pie por los cerros y su arte callejero.',
              status: ItineraryStatus.COMPLETED,
              order: 1,
            },
            {
              time: '11:30',
              title: 'Visita Museo a Cielo Abierto',
              location: 'Cerro Bellavista',
              description: 'Recorrido por murales históricos del museo a cielo abierto.',
              status: ItineraryStatus.COMPLETED,
              order: 2,
            },
            {
              time: '13:00',
              title: 'Almuerzo en Caleta Portales',
              location: 'Caleta Portales',
              description: 'Almuerzo con productos del mar frente a la caleta.',
              status: ItineraryStatus.COMPLETED,
              order: 3,
            },
            {
              time: '15:30',
              title: 'Tarde libre en la playa',
              location: 'Playa Las Salinas, Viña del Mar',
              description: 'Tarde de descanso en la playa, supervisada por los monitores.',
              status: ItineraryStatus.IN_PROGRESS,
              order: 4,
            },
            {
              time: '19:00',
              title: 'Descanso en hospedaje',
              location: 'Hostal Brisa Marina',
              description: 'Regreso al hospedaje para descansar antes del último día.',
              status: ItineraryStatus.PENDING,
              order: 5,
            },
          ],
        },
        announcements: {
          create: [
            {
              title: 'Llegamos a Valparaíso',
              message: 'Llegada sin novedades al hospedaje. Los alumnos están instalados y con energía para el recorrido de hoy.',
              authorName: 'Prof. Daniela Soto',
              type: AnnouncementType.INFO,
              createdAt: minutesAgo(60 * 28),
            },
            {
              title: 'Excelente comportamiento en el tour de cerros',
              message: 'El grupo se destacó por su buena conducta y participación durante todo el recorrido por los cerros porteños.',
              authorName: 'Prof. Daniela Soto',
              type: AnnouncementType.ACHIEVEMENT,
              createdAt: minutesAgo(60 * 5),
            },
            {
              title: 'Tarde de descanso en la playa',
              message: 'El grupo está disfrutando una tarde tranquila en Las Salinas. Sin novedades, clima agradable.',
              authorName: 'Coordinación',
              type: AnnouncementType.INFO,
              createdAt: minutesAgo(50),
            },
          ],
        },
        locationPings: {
          create: [
            { lat: -33.0246, lng: -71.5518, accuracy: 10, createdAt: minutesAgo(30) },
            { lat: -33.0231, lng: -71.5502, accuracy: 8, createdAt: minutesAgo(7) },
          ],
        },
      },
    }),

    prisma.trip.create({
      data: {
        name: '4° Medio A – Pucón y la Araucanía 2026',
        destination: 'Pucón, Chile',
        schoolId: losAndes.id,
        startDate: new Date('2026-06-15'),
        endDate: new Date('2026-06-21'),
        status: TripStatus.EMERGENCY,
        currentDay: 4,
        totalDays: 6,
        studentCount: 30,
        initialLat: -39.2784,
        initialLng: -71.976,
        accessCodes: {
          create: [
            { code: 'PUC-2026', role: Role.PARENT },
            { code: 'MON-PUC', role: Role.MONITOR },
          ],
        },
        itineraryItems: {
          create: [
            {
              time: '08:00',
              title: 'Desayuno',
              location: 'Refugio Los Volcanes, Pucón',
              description: 'Desayuno en el refugio antes de la actividad del día.',
              status: ItineraryStatus.COMPLETED,
              order: 1,
            },
            {
              time: '09:30',
              title: 'Trekking sector Los Pozones',
              location: 'Los Pozones',
              description: 'Caminata por sendero habilitado con guías de montaña.',
              status: ItineraryStatus.COMPLETED,
              order: 2,
            },
            {
              time: '13:00',
              title: 'Almuerzo',
              location: 'Refugio Los Volcanes',
              description: 'Almuerzo de recuperación tras el trekking.',
              status: ItineraryStatus.COMPLETED,
              order: 3,
            },
            {
              time: '15:00',
              title: 'Termas Geométricas',
              location: 'Termas Geométricas',
              description: 'Visita a las termas. Actividad pausada por la novedad reportada.',
              status: ItineraryStatus.IN_PROGRESS,
              order: 4,
            },
            {
              time: '19:00',
              title: 'Cena y reunión informativa',
              location: 'Refugio Los Volcanes',
              description: 'Cena y reunión con el equipo para informar a las familias.',
              status: ItineraryStatus.PENDING,
              order: 5,
            },
          ],
        },
        announcements: {
          create: [
            {
              title: 'Trekking completado sin novedades',
              message: 'El grupo completó el trekking en Los Pozones sin incidentes. Todos en buen estado físico y ánimo.',
              authorName: 'Prof. Matías Contreras',
              type: AnnouncementType.ACHIEVEMENT,
              createdAt: minutesAgo(60 * 6),
            },
            {
              title: 'Aviso: alumno con torcedura leve de tobillo',
              message:
                'Un alumno sufrió una torcedura leve de tobillo durante la bajada hacia las termas. Fue atendido por el monitor a cargo y derivado a control médico preventivo en Pucón. Se mantiene estable y consciente. Mantendremos informadas a las familias.',
              authorName: 'Coordinación',
              type: AnnouncementType.ALERT,
              createdAt: minutesAgo(35),
            },
            {
              title: 'Situación bajo control, monitoreo en curso',
              message: 'El alumno se encuentra en control médico, acompañado por un monitor. El resto del grupo continúa la actividad de forma normal en el refugio.',
              authorName: 'Coordinación',
              type: AnnouncementType.INFO,
              createdAt: minutesAgo(10),
            },
          ],
        },
        locationPings: {
          create: [
            { lat: -39.4233, lng: -71.6839, accuracy: 18, createdAt: minutesAgo(28) },
            { lat: -39.4221, lng: -71.6802, accuracy: 14, createdAt: minutesAgo(3) },
          ],
        },
      },
    }),

    prisma.trip.create({
      data: {
        name: '3° Medio B – Isla de Pascua 2026',
        destination: 'Isla de Pascua, Chile',
        schoolId: sagradosCorazones.id,
        startDate: new Date('2026-06-10'),
        endDate: new Date('2026-06-15'),
        status: TripStatus.FINISHED,
        currentDay: 5,
        totalDays: 5,
        studentCount: 26,
        initialLat: -27.1127,
        initialLng: -109.3497,
        accessCodes: {
          create: [
            { code: 'RAP-2026', role: Role.PARENT },
            { code: 'MON-RAP', role: Role.MONITOR },
          ],
        },
        itineraryItems: {
          create: [
            {
              time: '08:00',
              title: 'Desayuno',
              location: 'Hotel Tupa, Hanga Roa',
              description: 'Desayuno final antes del cierre de la gira.',
              status: ItineraryStatus.COMPLETED,
              order: 1,
            },
            {
              time: '09:30',
              title: 'Visita Ahu Tongariki',
              location: 'Ahu Tongariki',
              description: 'Visita al sitio arqueológico más grande de la isla.',
              status: ItineraryStatus.COMPLETED,
              order: 2,
            },
            {
              time: '13:00',
              title: 'Almuerzo',
              location: 'Hotel Tupa',
              description: 'Almuerzo de despedida con el grupo completo.',
              status: ItineraryStatus.COMPLETED,
              order: 3,
            },
            {
              time: '15:00',
              title: 'Cráter Rano Raraku',
              location: 'Rano Raraku',
              description: 'Visita a la cantera donde se esculpieron los moái.',
              status: ItineraryStatus.COMPLETED,
              order: 4,
            },
            {
              time: '19:00',
              title: 'Cena de despedida',
              location: 'Hotel Tupa',
              description: 'Cena de cierre con el grupo antes del vuelo de regreso.',
              status: ItineraryStatus.COMPLETED,
              order: 5,
            },
          ],
        },
        announcements: {
          create: [
            {
              title: 'Visitamos los moái de Tongariki',
              message: 'Día inolvidable en Ahu Tongariki. Los alumnos quedaron impresionados con la historia rapa nui.',
              authorName: 'Prof. Valentina Muñoz',
              type: AnnouncementType.INFO,
              createdAt: new Date('2026-06-13T16:00:00'),
            },
            {
              title: '¡Gira finalizada con éxito!',
              message: 'Cerramos la gira a Isla de Pascua sin novedades, con todos los alumnos en perfecto estado. ¡Gracias a todas las familias por su confianza!',
              authorName: 'Prof. Valentina Muñoz',
              type: AnnouncementType.ACHIEVEMENT,
              createdAt: new Date('2026-06-15T21:00:00'),
            },
            {
              title: 'Vuelo de regreso confirmado',
              message: 'El vuelo de regreso a Santiago está confirmado para mañana en la mañana. Llegada estimada al colegio: 14:00 hrs.',
              authorName: 'Coordinación',
              type: AnnouncementType.INFO,
              createdAt: new Date('2026-06-15T21:30:00'),
            },
          ],
        },
      },
    }),
  ])

  console.log(`Seeded ${trips.length} trips across ${schools.length} schools:`)
  for (const trip of trips) {
    console.log(`  - ${trip.name} (${trip.status})`)
  }
  console.log('')
  console.log('Access codes:')
  console.log('  Bariloche      → BAR-2026 (apoderado) / MON-2026 (monitor)')
  console.log('  Atacama        → ATA-2026 (apoderado) / MON-ATA (monitor)')
  console.log('  Valparaíso     → VAL-2026 (apoderado) / MON-VAL (monitor)')
  console.log('  Pucón          → PUC-2026 (apoderado) / MON-PUC (monitor)')
  console.log('  Isla de Pascua → RAP-2026 (apoderado) / MON-RAP (monitor)')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
