import type { TripStatus, ItineraryStatus, AnnouncementType, NotificationType, Role } from '@prisma/client'

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
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completado',
}

export const announcementTypeLabels: Record<AnnouncementType, string> = {
  INFO: 'Información',
  ALERT: 'Alerta',
  ACHIEVEMENT: 'Logro',
}

export const notificationTypeLabels: Record<NotificationType, string> = {
  TRIP_ALERT: 'Alertas',
  TRIP_ACHIEVEMENT: 'Logros',
  MONITOR_JOINED: 'Nuevos coordinadores',
  TRIP_STATUS_CHANGED: 'Cambios de estado',
  SYSTEM_ERROR: 'Errores del sistema',
}
