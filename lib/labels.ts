import type { TripStatus, ItineraryStatus, AnnouncementType, Role } from '@prisma/client'

// "Monitor" se muestra como "Coordinador" en toda la UI — el valor Role.MONITOR
// del enum y la ruta /monitor/[tripId] quedan igual por dentro, sin migración.
export const roleLabels: Record<Role, string> = {
  PARENT: 'Apoderado',
  MONITOR: 'Coordinador',
  STUDENT: 'Alumno',
}

export const tripStatusLabels: Record<TripStatus, string> = {
  IN_TRANSIT: 'En ruta',
  IN_ACTIVITY: 'En actividad',
  RESTING: 'Descansando',
  FINISHED: 'Finalizado',
}

export const itineraryStatusLabels: Record<ItineraryStatus, string> = {
  PENDING: 'Pendiente',
  IN_TRANSIT: 'En ruta',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completado',
}

export const announcementTypeLabels: Record<AnnouncementType, string> = {
  INFO: 'Información',
  ALERT: 'Alerta',
  ACHIEVEMENT: 'Logro',
}
