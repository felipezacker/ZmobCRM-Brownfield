import React, { useState, useCallback } from 'react';
import { Sparkles, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAIPreferenceExtraction } from '@/hooks/useAIPreferenceExtraction';
import type { ContactPreference } from '@/types';
import type { PreferencePurpose, PreferenceUrgency, PropertyType } from '@/types';

export interface SidebarPreferencesProps {
  contact: { id: string } | null;
  preferences: ContactPreference | null;
  onCreatePreferences: (initialData?: Partial<ContactPreference>) => void;
  onSetPreferences: (p: ContactPreference | null) => void;
  onUpdatePreference: (id: string, data: Record<string, unknown>) => void;
}

export const SidebarPreferences: React.FC<SidebarPreferencesProps> = ({
  contact,
  preferences,
  onCreatePreferences,
  onSetPreferences,
  onUpdatePreference,
}) => {
  const [collapsed, setCollapsed] = useState(true);

  const handleUpdate = useCallback((updates: Partial<ContactPreference>) => {
    if (preferences) {
      onUpdatePreference(preferences.id, updates);
      onSetPreferences({ ...preferences, ...updates });
    }
  }, [preferences, onUpdatePreference, onSetPreferences]);

  const { aiInput, setAiInput, aiLoading, handleAIExtract } = useAIPreferenceExtraction({
    preferences,
    onUpdate: handleUpdate,
    onCreate: onCreatePreferences,
  });

  return (
    <div className="pt-3 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setCollapsed(c => !c)}
          aria-expanded={!collapsed}
          className="flex items-center gap-1 cursor-pointer"
        >
          <span className="text-xs font-bold text-muted-foreground uppercase">Preferencias</span>
          <ChevronDown
            size={14}
            className={`text-muted-foreground transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
          />
        </button>
        {!preferences && contact && (
          <Button
            onClick={() => onCreatePreferences()}
            className="text-2xs text-primary-500 hover:text-primary-600 font-medium"
            title="Criar preferencias"
          >
            + Adicionar
          </Button>
        )}
      </div>

      {!collapsed && (<>
      {/* AI extraction input */}
      <div className="mb-2.5">
        <div className="flex gap-1.5">
          <input
            type="text"
            className="flex-1 min-w-0 rounded-md border border-violet-500/20 bg-violet-500/5 dark:bg-violet-500/10 px-2 py-1 text-xs text-foreground dark:text-muted-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-violet-500/30"
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
            className="shrink-0 rounded-md bg-violet-500/15 px-2 py-1 text-xs font-semibold text-violet-700 dark:text-violet-200 hover:bg-violet-500/25 transition-colors disabled:opacity-50"
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
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Finalidade</span>
            <select
              value={preferences.purpose || ''}
              onChange={e => {
                const val = (e.target.value || null) as PreferencePurpose | null;
                onUpdatePreference(preferences.id, { purpose: val });
                onSetPreferences({ ...preferences, purpose: val });
              }}
              className="text-xs text-foreground bg-transparent border border-border dark:border-border rounded-md px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
            >
              <option value="">--</option>
              <option value="MORADIA">Moradia</option>
              <option value="INVESTIMENTO">Investimento</option>
            </select>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Tipos</span>
            <div className="flex flex-wrap gap-1 justify-end">
              {(['APARTAMENTO', 'CASA', 'TERRENO', 'COMERCIAL'] as PropertyType[]).map(pt => (
                <Button
                  key={pt}
                  onClick={() => {
                    const current = preferences.propertyTypes;
                    const next = current.includes(pt)
                      ? current.filter(t => t !== pt)
                      : [...current, pt];
                    onUpdatePreference(preferences.id, { propertyTypes: next });
                    onSetPreferences({ ...preferences, propertyTypes: next });
                  }}
                  className={`text-3xs px-1.5 py-0.5 rounded-full border transition-colors ${
                    preferences.propertyTypes.includes(pt)
                      ? 'bg-primary-100 text-primary-700 border-primary-200 dark:bg-primary-500/10 dark:text-primary-400 dark:border-primary-500/20'
                      : 'bg-background text-muted-foreground border-border dark:bg-white/5  hover:text-secondary-foreground'
                  }`}
                >
                  {pt.charAt(0) + pt.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-muted-foreground text-xs">Faixa R$</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={preferences.priceMin ?? ''}
                onChange={e => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  onSetPreferences({ ...preferences, priceMin: val });
                }}
                onBlur={e => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  onUpdatePreference(preferences.id, { priceMin: val });
                }}
                placeholder="Min"
                className="w-20 text-xs bg-transparent border border-border dark:border-border rounded-md px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 text-foreground"
              />
              <span className="text-muted-foreground text-xs">-</span>
              <input
                type="number"
                value={preferences.priceMax ?? ''}
                onChange={e => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  onSetPreferences({ ...preferences, priceMax: val });
                }}
                onBlur={e => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  onUpdatePreference(preferences.id, { priceMax: val });
                }}
                placeholder="Max"
                className="w-20 text-xs bg-transparent border border-border dark:border-border rounded-md px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 text-foreground"
              />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Regioes</span>
            <input
              type="text"
              value={preferences.regions.join(', ')}
              onChange={e => {
                const val = e.target.value.split(',').map(r => r.trim()).filter(Boolean);
                onSetPreferences({ ...preferences, regions: val });
              }}
              onBlur={e => {
                const val = e.target.value.split(',').map(r => r.trim()).filter(Boolean);
                onUpdatePreference(preferences.id, { regions: val });
              }}
              placeholder="Zona Sul, Centro..."
              className="w-32 text-xs bg-transparent border border-border dark:border-border rounded-md px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 text-foreground text-right"
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Quartos min</span>
            <input
              type="number"
              min={0}
              value={preferences.bedroomsMin ?? ''}
              onChange={e => {
                const val = e.target.value ? Number(e.target.value) : null;
                onSetPreferences({ ...preferences, bedroomsMin: val });
              }}
              onBlur={e => {
                const val = e.target.value ? Number(e.target.value) : null;
                onUpdatePreference(preferences.id, { bedroomsMin: val });
              }}
              placeholder="--"
              className="w-14 text-xs bg-transparent border border-border dark:border-border rounded-md px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 text-foreground text-right"
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Vagas min</span>
            <input
              type="number"
              min={0}
              value={preferences.parkingMin ?? ''}
              onChange={e => {
                const val = e.target.value ? Number(e.target.value) : null;
                onSetPreferences({ ...preferences, parkingMin: val });
              }}
              onBlur={e => {
                const val = e.target.value ? Number(e.target.value) : null;
                onUpdatePreference(preferences.id, { parkingMin: val });
              }}
              placeholder="--"
              className="w-14 text-xs bg-transparent border border-border dark:border-border rounded-md px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 text-foreground text-right"
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Area min (m²)</span>
            <input
              type="number"
              min={0}
              value={preferences.areaMin ?? ''}
              onChange={e => {
                const val = e.target.value ? Number(e.target.value) : null;
                onSetPreferences({ ...preferences, areaMin: val });
              }}
              onBlur={e => {
                const val = e.target.value ? Number(e.target.value) : null;
                onUpdatePreference(preferences.id, { areaMin: val });
              }}
              placeholder="--"
              className="w-14 text-xs bg-transparent border border-border dark:border-border rounded-md px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 text-foreground text-right"
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Urgencia</span>
            <select
              value={preferences.urgency || ''}
              onChange={e => {
                const val = (e.target.value || null) as PreferenceUrgency | null;
                onUpdatePreference(preferences.id, { urgency: val });
                onSetPreferences({ ...preferences, urgency: val });
              }}
              className="text-xs text-foreground bg-transparent border border-border dark:border-border rounded-md px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
            >
              <option value="">--</option>
              <option value="IMMEDIATE">Imediato</option>
              <option value="3_MONTHS">3 meses</option>
              <option value="6_MONTHS">6 meses</option>
              <option value="1_YEAR">1 ano</option>
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground text-xs">Observacoes</span>
            <textarea
              className="w-full text-xs bg-transparent border border-border dark:border-border rounded-md px-1.5 py-1 outline-none focus:ring-1 focus:ring-primary-500 text-foreground min-h-[36px] resize-none"
              value={preferences.notes ?? ''}
              onChange={e => {
                onSetPreferences({ ...preferences, notes: e.target.value });
              }}
              onBlur={e => {
                const val = e.target.value.trim() || null;
                onUpdatePreference(preferences.id, { notes: val });
              }}
              placeholder="Detalhes adicionais..."
            />
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Sem preferencias cadastradas</p>
      )}
      </>)}
    </div>
  );
};
