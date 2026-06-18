'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import {
  TRIPS,
  ITINERARY,
  ANNOUNCEMENTS,
  type Trip,
  type ItineraryItem,
  type Announcement,
} from '@/lib/mock-data'

export interface LocationPoint {
  lat: number
  lng: number
  accuracy: number
  updatedAt: Date
}

interface TripContextValue {
  trip: Trip | null
  itinerary: ItineraryItem[]
  announcements: Announcement[]
  location: LocationPoint | null
  unreadCount: number
  markAllRead: () => void
}

const TripContext = createContext<TripContextValue | null>(null)

function drift(base: number, magnitude = 0.0015): number {
  return base + (Math.random() - 0.5) * magnitude
}

export function TripProvider({ tripId, children }: { tripId: string; children: ReactNode }) {
  const trip = TRIPS[tripId] ?? null

  const [location, setLocation] = useState<LocationPoint | null>(
    trip
      ? { lat: trip.initialLat, lng: trip.initialLng, accuracy: 12, updatedAt: new Date() }
      : null
  )
  const [unreadCount, setUnreadCount] = useState(1)

  useEffect(() => {
    if (!trip) return
    const id = setInterval(() => {
      setLocation((prev) =>
        prev
          ? {
              lat: drift(prev.lat),
              lng: drift(prev.lng),
              accuracy: Math.round(8 + Math.random() * 20),
              updatedAt: new Date(),
            }
          : prev
      )
    }, 12000)
    return () => clearInterval(id)
  }, [trip])

  return (
    <TripContext.Provider
      value={{
        trip,
        itinerary: ITINERARY,
        announcements: ANNOUNCEMENTS,
        location,
        unreadCount,
        markAllRead: () => setUnreadCount(0),
      }}
    >
      {children}
    </TripContext.Provider>
  )
}

export function useTripContext() {
  const ctx = useContext(TripContext)
  if (!ctx) throw new Error('useTripContext must be used within TripProvider')
  return ctx
}
