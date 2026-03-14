'use client';

import React from 'react';
import { Home, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAIPreferenceExtraction } from '@/hooks/useAIPreferenceExtraction';
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
  onCreatePreferences?: (initialData?: Partial<ContactPreference>) => void;
}

/** Preferences section: property types, price range, regions, bedrooms, urgency. */
export function PreferencesSection({
  preferences,
  collapsed,
  onToggle,
  onUpdatePreferences,
  onCreatePreferences,
}: PreferencesSectionProps) {
  const { aiInput, setAiInput, aiLoading, handleAIExtract } = useAIPreferenceExtraction({
    preferences,
    onUpdate: (updates) => onUpdatePreferences?.(updates),
    onCreate: onCreatePreferences,
  });

  return (
    <div className="rounded-xl border border-border bg-background dark:bg-white/2 p-3">
      <SectionHeader
        label="Preferencias"
        icon={<Home className="h-3.5 w-3.5" />}
        iconColor="text-violet-500 dark:text-violet-400"
        collapsed={collapsed}
        onToggle={onToggle}
      />
      {!collapsed && (
        <div className="mt-2">
          {/* AI extraction input */}
          <div className="mb-2.5">
            <div className="flex gap-1.5">
              <input
                type="text"
                className="flex-1 min-w-0 rounded-lg border border-violet-500/20 bg-violet-500/5 dark:bg-violet-500/10 px-2 py-1.5 text-xs text-foreground dark:text-muted-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-violet-500/30"
                placeholder="Ex: ap 3 quartos zona sul até 500k..."
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAIExtract(); }}
                disabled={aiLoading}
              />
              <Button
                type="button"
                variant="unstyled"
                size="unstyled"
                className="shrink-0 rounded-lg bg-violet-500/15 px-2 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-200 hover:bg-violet-500/25 transition-colors disabled:opacity-50"
                disabled={aiLoading || !aiInput.trim()}
                onClick={handleAIExtract}
              >
                {aiLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>

          {preferences ? (
            <div className="space-y-1.5 text-xs">
              {/* Finalidade */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Finalidade</span>
                <select
                  className={`${SELECT_CLASS} text-secondary-foreground dark:text-muted-foreground`}
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
                <span className="text-muted-foreground pt-0.5">Tipos</span>
                <div className="flex flex-wrap justify-end gap-1">
                  {PROPERTY_TYPES.map((pt) => {
                    const active = preferences.propertyTypes.includes(pt);
                    return (
                      <Button
                        variant="unstyled" size="unstyled" key={pt} type="button"
                        className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                          active
                            ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-200 ring-1 ring-cyan-500/30'
                            : 'bg-muted dark:bg-white/5 text-muted-foreground dark:text-muted-foreground hover:bg-accent dark:hover:bg-white/10'
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
              {/* Faixa R$ */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Faixa R$</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    className={`${INPUT_CLASS} text-secondary-foreground dark:text-muted-foreground text-right w-20`}
                    defaultValue={preferences.priceMin ?? ''}
                    placeholder="Min"
                    key={`pmin-${preferences.priceMin}`}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      onUpdatePreferences?.({ priceMin: v ? parseFloat(v) : null });
                    }}
                  />
                  <span className="text-muted-foreground">-</span>
                  <input
                    type="number"
                    className={`${INPUT_CLASS} text-secondary-foreground dark:text-muted-foreground text-right w-20`}
                    defaultValue={preferences.priceMax ?? ''}
                    placeholder="Max"
                    key={`pmax-${preferences.priceMax}`}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      onUpdatePreferences?.({ priceMax: v ? parseFloat(v) : null });
                    }}
                  />
                </div>
              </div>
              {/* Regioes */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Regioes</span>
                <input
                  type="text"
                  className={`${INPUT_CLASS} text-secondary-foreground dark:text-muted-foreground text-right flex-1 min-w-0`}
                  defaultValue={preferences.regions.join(', ')}
                  placeholder="Centro, Zona Sul..."
                  key={`reg-${preferences.regions.join(',')}`}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    const regions = v ? v.split(',').map((r) => r.trim()).filter(Boolean) : [];
                    onUpdatePreferences?.({ regions });
                  }}
                />
              </div>
              {/* Quartos min */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Quartos min.</span>
                <input
                  type="number"
                  className={`${INPUT_CLASS} text-secondary-foreground dark:text-muted-foreground text-right w-16`}
                  defaultValue={preferences.bedroomsMin ?? ''}
                  placeholder="--"
                  key={`bed-${preferences.bedroomsMin}`}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    onUpdatePreferences?.({ bedroomsMin: v ? parseInt(v, 10) : null });
                  }}
                />
              </div>
              {/* Vagas min */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Vagas min.</span>
                <input
                  type="number"
                  className={`${INPUT_CLASS} text-secondary-foreground dark:text-muted-foreground text-right w-16`}
                  defaultValue={preferences.parkingMin ?? ''}
                  placeholder="--"
                  key={`park-${preferences.parkingMin}`}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    onUpdatePreferences?.({ parkingMin: v ? parseInt(v, 10) : null });
                  }}
                />
              </div>
              {/* Area min */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Area min. (m²)</span>
                <input
                  type="number"
                  className={`${INPUT_CLASS} text-secondary-foreground dark:text-muted-foreground text-right w-16`}
                  defaultValue={preferences.areaMin ?? ''}
                  placeholder="--"
                  key={`area-${preferences.areaMin}`}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    onUpdatePreferences?.({ areaMin: v ? parseFloat(v) : null });
                  }}
                />
              </div>
              {/* Urgencia */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Urgencia</span>
                <select
                  className={`${SELECT_CLASS} text-secondary-foreground dark:text-muted-foreground`}
                  value={preferences.urgency ?? ''}
                  onChange={(e) => onUpdatePreferences?.({ urgency: e.target.value || null } as Partial<ContactPreference>)}
                >
                  <option value="">--</option>
                  {Object.entries(URGENCY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              {/* Observacoes */}
              <div className="space-y-1">
                <span className="text-muted-foreground">Observacoes</span>
                <textarea
                  className={`${INPUT_CLASS} text-secondary-foreground dark:text-muted-foreground w-full min-h-[40px] resize-none`}
                  defaultValue={preferences.notes ?? ''}
                  placeholder="Detalhes adicionais..."
                  key={`notes-${preferences.notes}`}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    onUpdatePreferences?.({ notes: v || null });
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Sem preferencias cadastradas</span>
              {onCreatePreferences ? (
                <Button
                  type="button"
                  className="rounded-lg bg-cyan-500/15 px-2 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-200 hover:bg-cyan-500/25 transition-colors"
                  onClick={() => onCreatePreferences?.()}
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
