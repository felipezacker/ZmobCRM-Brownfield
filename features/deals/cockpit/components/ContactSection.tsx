'use client';

import React from 'react';
import { Copy, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Contact, Deal } from '@/types';
import { humanizeTestLabel } from '@/features/deals/cockpit/cockpit-utils';
import { SectionHeader } from '@/features/deals/cockpit/components/SectionHeader';
import {
  INPUT_CLASS,
  SELECT_CLASS,
  TEMPERATURE_CONFIG,
  CLASSIFICATION_CONFIG,
} from '@/features/deals/cockpit/components/cockpit-data-constants';

export interface ContactSectionProps {
  contact: Contact | null;
  phoneE164: string | null;
  collapsed: boolean;
  onToggle: () => void;
  onCopy: (label: string, text: string) => void;
  onUpdateContact?: (updates: Partial<Contact>) => void;
  onUpdateDeal?: (updates: Partial<Deal>) => void;
}

/** Contact info section: name, temperature, classification, lead score, phone, email, source. */
export function ContactSection({
  contact,
  phoneE164,
  collapsed,
  onToggle,
  onCopy,
  onUpdateContact,
  onUpdateDeal,
}: ContactSectionProps) {
  const contactRecord = contact as Record<string, unknown> | null;
  const temperature = (contactRecord?.temperature ?? undefined) as string | undefined;
  const classification = (contactRecord?.classification ?? undefined) as string | undefined;
  const leadScore = (contactRecord?.leadScore ?? undefined) as number | undefined;

  return (
    <div className="rounded-xl border border-border bg-background dark:bg-white/2 p-3">
      <SectionHeader
        label="Contato"
        icon={<User className="h-3.5 w-3.5" />}
        iconColor="text-cyan-500 dark:text-cyan-400"
        collapsed={collapsed}
        onToggle={onToggle}
      />
      {!collapsed && (
        <div className="mt-2">
          {/* Nome editavel */}
          <input
            type="text"
            className={`${INPUT_CLASS} w-full text-base font-semibold text-foreground dark:text-muted-foreground`}
            defaultValue={humanizeTestLabel(contact?.name) || contact?.name || ''}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== contact?.name) {
                onUpdateContact?.({ name: v });
                onUpdateDeal?.({ title: v });
              }
            }}
            title="Editar nome do contato"
          />

          {/* Temperature + Classification selects */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              className={`${SELECT_CLASS} text-xs font-bold rounded-full px-2 py-0.5 ring-1 ${
                temperature && TEMPERATURE_CONFIG[temperature]
                  ? TEMPERATURE_CONFIG[temperature].color
                  : 'bg-muted dark:bg-white/5 text-muted-foreground ring-ring dark:ring-white/10'
              }`}
              value={temperature ?? ''}
              onChange={(e) => onUpdateContact?.({ temperature: e.target.value || null } as Partial<Contact>)}
            >
              <option value="">Temperatura</option>
              <option value="HOT">Quente</option>
              <option value="WARM">Morno</option>
              <option value="COLD">Frio</option>
            </select>
            <select
              className={`${SELECT_CLASS} text-xs font-bold rounded-full px-2 py-0.5 ring-1 ${
                classification && CLASSIFICATION_CONFIG[classification]
                  ? CLASSIFICATION_CONFIG[classification].color
                  : 'bg-muted dark:bg-white/5 text-muted-foreground ring-ring dark:ring-white/10'
              }`}
              value={classification ?? ''}
              onChange={(e) => onUpdateContact?.({ classification: e.target.value || null } as Partial<Contact>)}
            >
              <option value="">Classificacao</option>
              {Object.entries(CLASSIFICATION_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>

          {/* Lead Score (read-only) */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Score</span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-accent dark:bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${
                  (leadScore ?? 0) <= 30 ? 'bg-red-500' :
                  (leadScore ?? 0) <= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, leadScore ?? 0)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground">
              {leadScore ?? 0}
              <span className="ml-1 text-[10px] font-normal text-muted-foreground dark:text-muted-foreground">
                {(leadScore ?? 0) <= 30 ? 'Frio' : (leadScore ?? 0) <= 60 ? 'Morno' : 'Quente'}
              </span>
            </span>
          </div>

          {/* Phone + Email + Source */}
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Tel</span>
              <span className="flex items-center gap-2">
                <input
                  type="tel"
                  className={`${INPUT_CLASS} font-mono text-sm text-secondary-foreground dark:text-muted-foreground text-right w-32`}
                  defaultValue={contact?.phone ?? ''}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (contact?.phone ?? '')) onUpdateContact?.({ phone: v || null } as Partial<Contact>);
                  }}
                />
                <Button
                  type="button"
                  className="rounded-lg border border-border bg-background dark:bg-white/2 p-1.5 text-secondary-foreground dark:text-muted-foreground hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors"
                  title="Copiar telefone"
                  onClick={() => phoneE164 && onCopy('Telefone', phoneE164)}
                  disabled={!phoneE164}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Email</span>
              <span className="flex items-center gap-2 min-w-0">
                <input
                  type="email"
                  className={`${INPUT_CLASS} text-sm text-secondary-foreground dark:text-muted-foreground text-right min-w-0 flex-1`}
                  defaultValue={contact?.email ?? ''}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (contact?.email ?? '')) onUpdateContact?.({ email: v || null } as Partial<Contact>);
                  }}
                />
                <Button
                  type="button"
                  className="shrink-0 rounded-lg border border-border bg-background dark:bg-white/2 p-1.5 text-secondary-foreground dark:text-muted-foreground hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors"
                  title="Copiar email"
                  onClick={() => contact?.email && onCopy('Email', contact.email)}
                  disabled={!contact?.email}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Origem</span>
              <input
                type="text"
                className={`${INPUT_CLASS} text-secondary-foreground dark:text-muted-foreground text-right w-28`}
                defaultValue={contact?.source ?? ''}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (contact?.source ?? '')) onUpdateContact?.({ source: v || null } as Partial<Contact>);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
