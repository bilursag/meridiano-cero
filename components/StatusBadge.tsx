import type { TripStatus } from '@prisma/client'
import { tripStatusLabels } from '@/lib/labels'

const cfg: Record<TripStatus, { dot: string; chip: string }> = {
  IN_TRANSIT: { dot: 'bg-amber-500', chip: 'chip-amber' },
  IN_ACTIVITY: { dot: 'bg-blue-500', chip: 'chip-blue' },
  RESTING: { dot: 'bg-green-500', chip: 'chip-green' },
  EMERGENCY: { dot: 'bg-red-500', chip: 'chip-red' },
  FINISHED: { dot: 'bg-slate-400', chip: 'chip-slate' },
}

export default function StatusBadge({ status }: { status: TripStatus }) {
  const { dot, chip } = cfg[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${chip}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} animate-pulse`} />
      {tripStatusLabels[status]}
    </span>
  )
}
