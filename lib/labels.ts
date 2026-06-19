import type { TripStatus, ItineraryStatus, AnnouncementType } from '@prisma/client'

export const tripStatusLabels: Record<TripStatus, string> = {
  IN_TRANSIT: 'En ruta',
  IN_ACTIVITY: 'En actividad',
  RESTING: 'Descansando',
  EMERGENCY: 'Emergencia',
  FINISHED: 'Finalizado',
}

export const itineraryStatusLabels: Record<ItineraryStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completado',
}

export const announcementTypeLabels: Record<AnnouncementType, string> = {
  INFO: 'Información',
  ALERT: 'Alerta',
  ACHIEVEMENT: 'Logro',
}
