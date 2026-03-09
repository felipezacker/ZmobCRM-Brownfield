'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SectionHeaderProps {
  label: string;
  icon: React.ReactNode;
  iconColor: string;
  collapsed: boolean;
  onToggle: () => void;
}

/** Collapsible section header used by all CockpitDataPanel sections. */
export function SectionHeader({ label, icon, iconColor, collapsed, onToggle }: SectionHeaderProps) {
  return (
    <Button variant="unstyled" size="unstyled" type="button" className="flex w-full items-center justify-between" onClick={onToggle}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">
        <span className={iconColor}>{icon}</span> {label}
      </div>
      <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`} />
    </Button>
  );
}
