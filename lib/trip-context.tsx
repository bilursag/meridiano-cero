'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Trip, ItineraryItem, Announcement } from '@prisma/client'

export type TripWithSchool = Trip & { school: { name: string } }

export interface LocationPoint {
  lat: number
  lng: number
  accuracy: number
  updatedAt: Date
}

interface TripContextValue {
  trip: TripWithSchool | null
  itinerary: ItineraryItem[]
  announcements: Announcement[]
  location: LocationPoint | null
  unreadCount: number
  markAllRead: () => void
}

const TripContext = createContext<TripContextValue | null>(null)

const LOCATION_POLL_MS = 12000

export function TripProvider({ tripId, children }: { tripId: string; children: ReactNode }) {
  const [trip, setTrip] = useState<TripWithSchool | null>(null)
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [location, setLocation] = useState<LocationPoint | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [tripRes, itineraryRes, announcementsRes] = await Promise.all([
        fetch(`/api/v1/trips/${tripId}`),
        fetch(`/api/v1/trips/${tripId}/itinerary`),
        fetch(`/api/v1/trips/${tripId}/announcements`),
      ])
      if (cancelled) return

      if (tripRes.ok) setTrip((await tripRes.json()).trip)
      if (itineraryRes.ok) setItinerary((await itineraryRes.json()).items)
      if (announcementsRes.ok) {
        const { announcements: list } = await announcementsRes.json()
        setAnnouncements(list)
        setUnreadCount(list.length)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [tripId])

  const pollLocation = useCallback(async () => {
    const res = await fetch(`/api/v1/trips/${tripId}/location`)
    if (!res.ok) return
    const { ping } = await res.json()
    if (ping) {
      setLocation({ lat: ping.lat, lng: ping.lng, accuracy: ping.accuracy, updatedAt: new Date(ping.createdAt) })
    }
  }, [tripId])

  useEffect(() => {
    const initialId = window.setTimeout(() => {
      void pollLocation()
    }, 0)
    const intervalId = window.setInterval(pollLocation, LOCATION_POLL_MS)

    return () => {
      window.clearTimeout(initialId)
      window.clearInterval(intervalId)
    }
  }, [pollLocation])

  return (
    <TripContext.Provider
      value={{
        trip,
        itinerary,
        announcements,
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
