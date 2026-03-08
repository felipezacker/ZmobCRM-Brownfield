import React from 'react';
import { Button } from '@/components/ui/button';
import type { ContactPreference } from '@/types';
import type { PreferencePurpose, PreferenceUrgency, PropertyType } from '@/types';

export interface SidebarPreferencesProps {
  contact: { id: string } | null;
  preferences: ContactPreference | null;
  onCreatePreferences: () => void;
  onSetPreferences: (p: ContactPreference | null) => void;
  onUpdatePreference: (id: string, data: Record<string, unknown>) => void;
}

export const SidebarPreferences: React.FC<SidebarPreferencesProps> = ({
  contact,
  preferences,
  onCreatePreferences,
  onSetPreferences,
  onUpdatePreference,
}) => (
  <div className="pt-3 border-t border-border">
    <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2 flex items-center gap-2">
      Preferencias
      {!preferences && contact && (
        <Button
          onClick={onCreatePreferences}
          className="text-[10px] text-primary-500 hover:text-primary-600 font-medium"
          title="Criar preferencias"
        >
          + Adicionar
        </Button>
      )}
    </h3>
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
            <option value="VERANEIO">Veraneio</option>
          </select>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-xs">Tipos</span>
          <div className="flex flex-wrap gap-1 justify-end">
            {(['APARTAMENTO', 'CASA', 'TERRENO', 'COMERCIAL', 'RURAL', 'GALPAO'] as PropertyType[]).map(pt => (
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
                className={`text-[9px] px-1.5 py-0.5 rounded-full border transition-colors ${
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
      </div>
    ) : (
      <p className="text-xs text-muted-foreground italic">Sem preferencias cadastradas</p>
    )}
  </div>
);
