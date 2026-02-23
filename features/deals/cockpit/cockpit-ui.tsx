'use client';

import React from 'react';

export function Chip({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'success' | 'danger' | 'neutral';
}) {
  const cls =
    tone === 'success'
      ? 'inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-500/20'
      : tone === 'danger'
        ? 'inline-flex items-center rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-200 ring-1 ring-rose-500/20'
        : 'inline-flex items-center rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-semibold text-slate-200 ring-1 ring-white/10';
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
    <div className={`rounded-2xl border border-white/10 bg-white/3 ${className}`}>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          {icon}
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</div>
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
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={
        active
          ? 'border-b-2 border-cyan-400 px-3 py-3 text-xs font-semibold text-cyan-200'
          : 'border-b-2 border-transparent px-3 py-3 text-xs font-semibold text-slate-500 hover:text-slate-300'
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
}
