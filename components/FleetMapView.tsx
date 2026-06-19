'use client'

import { useEffect, useRef } from 'react'
import type L from 'leaflet'

export interface FleetMarker {
  id: string
  lat: number
  lng: number
  label: string
  sublabel?: string
  color?: string
}

interface Props {
  markers: FleetMarker[]
  height?: string
  selectedId?: string | null
  onMarkerClick?: (id: string) => void
}

function buildIcon(Leaflet: typeof L, color: string) {
  return Leaflet.divIcon({
    className: '',
    html: `<div style="width:38px;height:38px;background:${color};border-radius:50%;border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>
    </div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -22],
  })
}

export default function FleetMapView({ markers, height = '480px', selectedId, onMarkerClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const leafletRef = useRef<typeof L | null>(null)
  const markerLayerRef = useRef<L.LayerGroup | null>(null)
  const markerRefs = useRef<Map<string, L.Marker>>(new Map())

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

      localMap = Leaflet.map(containerRef.current!, { zoomControl: true }).setView([-33.45, -70.65], 5)
      Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(localMap)

      mapRef.current = localMap
      leafletRef.current = Leaflet
      markerLayerRef.current = Leaflet.layerGroup().addTo(localMap)
    })

    const markers = markerRefs.current

    return () => {
      cancelled = true
      if (localMap) localMap.remove()
      else if (mapRef.current) mapRef.current.remove()
      mapRef.current = null
      markerLayerRef.current = null
      markers.clear()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const Leaflet = leafletRef.current
    const layer = markerLayerRef.current
    if (!map || !Leaflet || !layer) return

    layer.clearLayers()
    markerRefs.current.clear()

    markers.forEach((marker) => {
      const icon = buildIcon(Leaflet, marker.color ?? '#1d4ed8')
      const leafletMarker = Leaflet.marker([marker.lat, marker.lng], { icon })
        .bindPopup(
          `<strong style="font-size:13px">${marker.label}</strong>${marker.sublabel ? `<br><small style="color:#64748b">${marker.sublabel}</small>` : ''}`
        )
        .on('click', () => onMarkerClick?.(marker.id))
      leafletMarker.addTo(layer)
      markerRefs.current.set(marker.id, leafletMarker)
    })

    if (markers.length > 0) {
      const bounds = Leaflet.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]))
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedId) return
    const marker = markerRefs.current.get(selectedId)
    if (!marker) return
    map.panTo(marker.getLatLng(), { animate: true, duration: 0.8 })
    marker.openPopup()
  }, [selectedId])

  return <div ref={containerRef} style={{ height, width: '100%' }} className="overflow-hidden rounded-xl" />
}
