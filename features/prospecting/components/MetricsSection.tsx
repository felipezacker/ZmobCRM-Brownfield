'use client'

import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MetricsSectionProps {
  title: string
  icon: React.ElementType
  iconColor?: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export function MetricsSection({
  title,
  icon: Icon,
  iconColor = 'text-muted-foreground',
  defaultOpen = true,
  children,
}: MetricsSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div>
      <Button
        variant="unstyled"
        size="unstyled"
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2 w-full py-2 group"
      >
        <Icon size={14} className={iconColor} />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <div className="flex-1 h-px bg-border dark:bg-border/50 mx-2" />
        <ChevronDown
          size={14}
          className={`text-muted-foreground transition-transform duration-200 ${
            isOpen ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </Button>
      {isOpen && (
        <div className="space-y-4 mt-1">
          {children}
        </div>
      )}
    </div>
  )
}
