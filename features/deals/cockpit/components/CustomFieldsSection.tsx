'use client';

import React from 'react';
import { Settings } from 'lucide-react';
import type { CustomFieldDefinition } from '@/types';
import { SectionHeader } from '@/features/deals/cockpit/components/SectionHeader';

export interface CustomFieldsSectionProps {
  customFields: Record<string, any> | undefined;
  filledCustomFields: CustomFieldDefinition[];
  collapsed: boolean;
  onToggle: () => void;
}

/** Custom fields section (read-only, conditional render). */
export function CustomFieldsSection({
  customFields,
  filledCustomFields,
  collapsed,
  onToggle,
}: CustomFieldsSectionProps) {
  if (filledCustomFields.length === 0 || !customFields) return null;

  return (
    <div className="rounded-xl border border-border bg-background dark:bg-white/2 p-3">
      <SectionHeader
        label="Campos Custom"
        icon={<Settings className="h-3.5 w-3.5" />}
        iconColor="text-muted-foreground dark:text-muted-foreground"
        collapsed={collapsed}
        onToggle={onToggle}
      />
      {!collapsed && (
        <div className="mt-2 space-y-1.5 text-xs">
          {filledCustomFields.map((def) => (
            <div key={def.id} className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{def.label}</span>
              <span className="text-secondary-foreground dark:text-muted-foreground text-right truncate max-w-[60%]">
                {String(customFields[def.key])}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
