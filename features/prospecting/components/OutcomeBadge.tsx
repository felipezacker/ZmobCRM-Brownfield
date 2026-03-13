import { getOutcomeBadge } from '../constants'

export function OutcomeBadge({ outcome }: { outcome?: string }) {
  const { label, color } = getOutcomeBadge(outcome)
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-2xs font-medium ${color}`}>
      {label}
    </span>
  )
}
