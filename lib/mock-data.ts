export type TripStatus = 'En ruta' | 'En actividad' | 'Descansando' | 'Emergencia' | 'Finalizado'
export type ItineraryStatus = 'completado' | 'en-curso' | 'pendiente'
export type AnnouncementType = 'info' | 'alerta' | 'logro'
export type UserRole = 'apoderado' | 'monitor' | 'admin'

export interface Trip {
  id: string
  code: string
  name: string
  destination: string
  school: string
  startDate: string
  endDate: string
  status: TripStatus
  currentDay: number
  totalDays: number
  studentCount: number
  monitor: string
  monitorPhone: string
  initialLat: number
  initialLng: number
}

export interface ItineraryItem {
  id: string
  time: string
  title: string
  location: string
  description: string
  status: ItineraryStatus
}

export interface Announcement {
  id: string
  tripId: string
  title: string
  message: string
  author: string
  type: AnnouncementType
  createdAt: string
}

export const TRIPS: Record<string, Trip> = {
  'bar-2026': {
    id: 'bar-2026',
    code: 'BAR-2026',
    name: '4° Medio B – Bariloche 2026',
    destination: 'Bariloche, Argentina',
    school: 'Colegio San Martín de Tours',
    startDate: '2026-06-16',
    endDate: '2026-06-22',
    status: 'En ruta',
    currentDay: 3,
    totalDays: 7,
    studentCount: 34,
    monitor: 'Prof. Carolina Herrera',
    monitorPhone: '+56 9 8765 4321',
    initialLat: -41.1335,
    initialLng: -71.3103,
  },
}

export const ACCESS_CODES: Record<string, { tripId: string; role: UserRole }> = {
  'BAR-2026': { tripId: 'bar-2026', role: 'apoderado' },
  'MON-2026': { tripId: 'bar-2026', role: 'monitor' },
  'ADMIN-2026': { tripId: '', role: 'admin' },
}

export const ITINERARY: ItineraryItem[] = [
  {
    id: '1',
    time: '07:00',
    title: 'Desayuno en hotel',
    location: 'Hotel Patagonia, Bariloche',
    description: 'Desayuno buffet incluido. Hora de salida: 08:45.',
    status: 'completado',
  },
  {
    id: '2',
    time: '09:00',
    title: 'Visita Bosque de Arrayanes',
    location: 'Parque Nac. Nahuel Huapi',
    description: 'Caminata guiada por el bosque de arrayanes. Duración: 2 horas aprox.',
    status: 'completado',
  },
  {
    id: '3',
    time: '12:30',
    title: 'Almuerzo',
    location: 'Restaurante El Viejo Munich',
    description: 'Almuerzo en grupo con menú cerrado.',
    status: 'completado',
  },
  {
    id: '4',
    time: '14:30',
    title: 'Excursión en lancha',
    location: 'Lago Nahuel Huapi',
    description: 'Paseo en lancha con guía especializado. Duración: 2 horas.',
    status: 'en-curso',
  },
  {
    id: '5',
    time: '18:00',
    title: 'Tiempo libre – Centro Cívico',
    location: 'Centro Cívico, Bariloche',
    description: 'Tiempo libre. Punto de encuentro a las 19:45 en la plaza.',
    status: 'pendiente',
  },
  {
    id: '6',
    time: '20:30',
    title: 'Cena en hotel',
    location: 'Hotel Patagonia, Bariloche',
    description: 'Cena en el comedor del hotel.',
    status: 'pendiente',
  },
]

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: '3',
    tripId: 'bar-2026',
    title: 'En la lancha – Todo bien',
    message:
      'Embarcamos hace 20 minutos. El tiempo está perfecto y todos están disfrutando el lago Nahuel Huapi. ¡Vistas increíbles desde el agua!',
    author: 'Prof. Carolina Herrera',
    type: 'info',
    createdAt: '2026-06-18T15:10:00',
  },
  {
    id: '2',
    tripId: 'bar-2026',
    title: 'Cambio menor en itinerario',
    message:
      'La visita al Cerro Campanario del día de mañana se adelanta 30 minutos (salida 09:00 en vez de 09:30). Se ajustó el almuerzo en consecuencia.',
    author: 'Coordinación',
    type: 'alerta',
    createdAt: '2026-06-18T11:00:00',
  },
  {
    id: '1',
    tripId: 'bar-2026',
    title: '¡Llegamos a Bariloche!',
    message:
      'Después de un vuelo tranquilo desde Santiago, llegamos al hotel sin ninguna novedad. Todos los alumnos están bien. Esta noche cena de bienvenida y descanso. ¡La gira comenzó!',
    author: 'Prof. Carolina Herrera',
    type: 'logro',
    createdAt: '2026-06-16T20:30:00',
  },
]
