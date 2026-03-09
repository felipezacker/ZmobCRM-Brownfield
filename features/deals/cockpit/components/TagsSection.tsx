'use client';

import React from 'react';
import { Tag } from 'lucide-react';
import { SectionHeader } from '@/features/deals/cockpit/components/SectionHeader';

export interface TagsSectionProps {
  tags: string[] | undefined;
  collapsed: boolean;
  onToggle: () => void;
}

/** Tags section (read-only, conditional render). */
export function TagsSection({ tags, collapsed, onToggle }: TagsSectionProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-background dark:bg-white/2 p-3">
      <SectionHeader
        label="Tags"
        icon={<Tag className="h-3.5 w-3.5" />}
        iconColor="text-rose-500 dark:text-rose-400"
        collapsed={collapsed}
        onToggle={onToggle}
      />
      {!collapsed && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border bg-muted dark:bg-white/5 px-2 py-0.5 text-xs font-medium text-secondary-foreground dark:text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
