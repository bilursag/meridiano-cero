'use client'

import { useEffect, useRef } from 'react'
import type L from 'leaflet'

interface Props {
  lat: number
  lng: number
  height?: string
  zoom?: number
  label?: string
}

export default function MapView({ lat, lng, height = '400px', zoom = 14, label = 'Grupo' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let cancelled = false
    let localMap: L.Map | null = null

    import('leaflet').then((mod) => {
      if (cancelled || !containerRef.current || mapRef.current) return
      const Leaflet = mod.default

      if (!document.getElementById('mc-leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'mc-leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      localMap = Leaflet.map(containerRef.current!, { zoomControl: true }).setView(
        [lat, lng],
        zoom
      )

      Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(localMap)

      const icon = Leaflet.divIcon({
        className: '',
        html: `<div style="width:46px;height:46px;background:#1d4ed8;border-radius:50%;border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
        </div>`,
        iconSize: [46, 46],
        iconAnchor: [23, 23],
        popupAnchor: [0, -26],
      })

      const marker = Leaflet.marker([lat, lng], { icon })
        .addTo(localMap)
        .bindPopup(
          `<strong style="font-size:13px">${label}</strong><br><small style="color:#64748b">Actualización en tiempo real</small>`
        )

      mapRef.current = localMap
      markerRef.current = marker
    })

    return () => {
      cancelled = true
      if (localMap) {
        localMap.remove()
      } else if (mapRef.current) {
        mapRef.current.remove()
      }
      mapRef.current = null
      markerRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return
    const ll = [lat, lng] as [number, number]
    markerRef.current.setLatLng(ll)
    mapRef.current.panTo(ll, { animate: true, duration: 0.8 })
  }, [lat, lng])

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%' }}
      className="rounded-xl overflow-hidden"
    />
  )
}
