'use client'

import dynamic from 'next/dynamic'
import type { GlobeConfig } from '@/components/ui/globe'

const World = dynamic(() => import('@/components/ui/globe').then((m) => m.World), { ssr: false })

const GLOBE_CONFIG: GlobeConfig = {
  pointSize: 4,
  globeColor: '#062056',
  showAtmosphere: true,
  atmosphereColor: '#3b82f6',
  atmosphereAltitude: 0.15,
  emissive: '#062056',
  emissiveIntensity: 0.1,
  shininess: 0.9,
  polygonColor: 'rgba(255,255,255,0.7)',
  ambientLight: '#38bdf8',
  directionalLeftLight: '#ffffff',
  directionalTopLight: '#ffffff',
  pointLight: '#ffffff',
  arcTime: 1500,
  arcLength: 0.9,
  rings: 1,
  maxRings: 3,
}

type Route = {
  start: { lat: number; lng: number; label?: string }
  end: { lat: number; lng: number; label?: string }
}

export function HeroGlobe({ routes }: { routes: Route[] }) {
  const data = routes.map((route, index) => ({
    order: index,
    startLat: route.start.lat,
    startLng: route.start.lng,
    endLat: route.end.lat,
    endLng: route.end.lng,
    arcAlt: 0.3,
    color: '#3b82f6',
  }))

  return (
    <div className="h-[420px] w-full md:h-[480px]">
      <World globeConfig={GLOBE_CONFIG} data={data} />
    </div>
  )
}
