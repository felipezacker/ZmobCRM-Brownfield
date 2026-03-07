'use client';

import React from 'react';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ContactPreference } from '@/types';
import { SectionHeader } from '@/features/deals/cockpit/components/SectionHeader';
import {
  INPUT_CLASS,
  SELECT_CLASS,
  PURPOSE_LABELS,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  URGENCY_LABELS,
} from '@/features/deals/cockpit/components/cockpit-data-constants';

export interface PreferencesSectionProps {
  preferences: ContactPreference | null;
  collapsed: boolean;
  onToggle: () => void;
  onUpdatePreferences?: (updates: Partial<ContactPreference>) => void;
  onCreatePreferences?: () => void;
}

/** Preferences section: property types, price range, regions, bedrooms, urgency. */
export function PreferencesSection({
  preferences,
  collapsed,
  onToggle,
  onUpdatePreferences,
  onCreatePreferences,
}: PreferencesSectionProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 p-3">
      <SectionHeader
        label="Preferencias"
        icon={<Home className="h-3.5 w-3.5" />}
        iconColor="text-violet-500 dark:text-violet-400"
        collapsed={collapsed}
        onToggle={onToggle}
      />
      {!collapsed && (
        <div className="mt-2">
          {preferences ? (
            <div className="space-y-1.5 text-xs">
              {/* Finalidade */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Finalidade</span>
                <select
                  className={`${SELECT_CLASS} text-slate-700 dark:text-slate-200`}
                  value={preferences.purpose ?? ''}
                  onChange={(e) => onUpdatePreferences?.({ purpose: e.target.value || null } as Partial<ContactPreference>)}
                >
                  <option value="">--</option>
                  {Object.entries(PURPOSE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              {/* Tipos imovel -- chips toggle */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-500 pt-0.5">Tipos</span>
                <div className="flex flex-wrap justify-end gap-1">
                  {PROPERTY_TYPES.map((pt) => {
                    const active = preferences.propertyTypes.includes(pt);
                    return (
                      <Button
                        variant="unstyled" size="unstyled" key={pt} type="button"
                        className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                          active
                            ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-200 ring-1 ring-cyan-500/30'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'
                        }`}
                        onClick={() => {
                          const next = active
                            ? preferences.propertyTypes.filter((t) => t !== pt)
                            : [...preferences.propertyTypes, pt];
                          onUpdatePreferences?.({ propertyTypes: next });
                        }}
                      >
                        {PROPERTY_TYPE_LABELS[pt] ?? pt}
                      </Button>
                    );
                  })}
                </div>
              </div>
              {/* Faixa de preco */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Preco min</span>
                <input
                  type="number"
                  className={`${INPUT_CLASS} text-slate-700 dark:text-slate-200 text-right w-24`}
                  defaultValue={preferences.priceMin ?? ''}
                  placeholder="--"
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    onUpdatePreferences?.({ priceMin: v ? parseFloat(v) : null });
                  }}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Preco max</span>
                <input
                  type="number"
                  className={`${INPUT_CLASS} text-slate-700 dark:text-slate-200 text-right w-24`}
                  defaultValue={preferences.priceMax ?? ''}
                  placeholder="--"
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    onUpdatePreferences?.({ priceMax: v ? parseFloat(v) : null });
                  }}
                />
              </div>
              {/* Regioes */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Regioes</span>
                <input
                  type="text"
                  className={`${INPUT_CLASS} text-slate-700 dark:text-slate-200 text-right flex-1 min-w-0`}
                  defaultValue={preferences.regions.join(', ')}
                  placeholder="Centro, Zona Sul..."
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    const regions = v ? v.split(',').map((r) => r.trim()).filter(Boolean) : [];
                    onUpdatePreferences?.({ regions });
                  }}
                />
              </div>
              {/* Quartos min */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Quartos min.</span>
                <input
                  type="number"
                  className={`${INPUT_CLASS} text-slate-700 dark:text-slate-200 text-right w-16`}
                  defaultValue={preferences.bedroomsMin ?? ''}
                  placeholder="--"
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    onUpdatePreferences?.({ bedroomsMin: v ? parseInt(v, 10) : null });
                  }}
                />
              </div>
              {/* Urgencia */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Urgencia</span>
                <select
                  className={`${SELECT_CLASS} text-slate-700 dark:text-slate-200`}
                  value={preferences.urgency ?? ''}
                  onChange={(e) => onUpdatePreferences?.({ urgency: e.target.value || null } as Partial<ContactPreference>)}
                >
                  <option value="">--</option>
                  {Object.entries(URGENCY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Sem preferencias cadastradas</span>
              {onCreatePreferences ? (
                <Button
                  type="button"
                  className="rounded-lg bg-cyan-500/15 px-2 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-200 hover:bg-cyan-500/25 transition-colors"
                  onClick={onCreatePreferences}
                >
                  Cadastrar
                </Button>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
