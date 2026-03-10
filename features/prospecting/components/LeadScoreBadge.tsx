import React from 'react'
import { TrendingUp } from 'lucide-react'

interface LeadScoreBadgeProps {
  score: number | null | undefined
  size?: 'sm' | 'md'
}

function getScoreConfig(score: number) {
  if (score > 60) {
    return { color: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400', label: 'Quente' }
  }
  if (score >= 30) {
    return { color: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400', label: 'Morno' }
  }
  return { color: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400', label: 'Frio' }
}

export const LeadScoreBadge: React.FC<LeadScoreBadgeProps> = ({ score, size = 'sm' }) => {
  if (score == null) return null

  const config = getScoreConfig(score)
  const iconSize = size === 'sm' ? 9 : 11
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs'
  const padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-0.5'

  return (
    <span
      className={`inline-flex items-center gap-0.5 font-medium rounded-full ${config.color} ${textSize} ${padding}`}
      title={`Lead Score: ${score}/100 (${config.label})`}
    >
      <TrendingUp size={iconSize} />
      {score}
    </span>
  )
}
