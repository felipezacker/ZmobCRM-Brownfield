'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

export function Chip({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'success' | 'danger' | 'neutral';
}) {
  const cls =
    tone === 'success'
      ? 'inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-200 ring-1 ring-emerald-500/20'
      : tone === 'danger'
        ? 'inline-flex items-center rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:text-rose-200 ring-1 ring-rose-500/20'
        : 'inline-flex items-center rounded-full bg-accent/60 dark:bg-white/8 px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground dark:text-muted-foreground ring-1 ring-ring dark:ring-white/10';
  return <span className={cls}>{children}</span>;
}

export function Panel({
  title,
  icon,
  right,
  children,
  className = '',
  bodyClassName = '',
}: {
  title: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border  bg-white dark:bg-white/3 ${className}`}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          {icon}
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">{title}</div>
        </div>
        {right}
      </div>
      <div className={`p-4 ${bodyClassName}`}>{children}</div>
    </div>
  );
}

export function TabButton({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <Button
      type="button"
      className={active
 ?'border-b-2 border-cyan-500 dark:border-cyan-400 px-3 py-3 text-xs font-semibold text-cyan-600 dark:text-cyan-200'
          : 'border-b-2 border-transparent px-3 py-3 text-xs font-semibold text-muted-foreground hover:text-secondary-foreground dark:hover:text-muted-foreground'
      }
      onClick={onClick}
    >
      {children}
      {count != null && count > 0 && (
        <span className={`ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
          active
            ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-200'
            : 'bg-accent dark:bg-white/10 text-muted-foreground dark:text-muted-foreground'
        }`}>
          {count}
        </span>
      )}
    </Button>
  );
}
