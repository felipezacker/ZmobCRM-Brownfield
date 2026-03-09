import React from 'react';
import {
  Phone,
  Mail,
  Copy,
  User,
  Tag as TagIcon,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DealDetailSidebarProps } from '@/features/boards/components/deal-detail/types';
import type { ContactTemperature, ContactClassification, CustomFieldDefinition, Contact } from '@/types';
import { SidebarPreferences } from '@/features/boards/components/deal-detail/sidebar-preferences';
import { SidebarDetails } from '@/features/boards/components/deal-detail/sidebar-details';

export const DealDetailSidebar: React.FC<DealDetailSidebarProps> = ({
  deal,
  contact,
  resolvedContactName,
  preferences,
  propertyRef,
  customFieldDefinitions,
  lifecycleStageById,
  estimatedCommission,
  onUpdateContact,
  onUpdateDeal,
  onPropertyRefChange,
  onSetPreferences,
  onCreatePreferences,
  onUpdatePreference,
  onCopyPhone,
}) => {
  return (
    <div className="space-y-4">
      {/* CONTATO (editavel) */}
      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2 flex items-center gap-2">
          <User size={14} /> Contato
        </h3>
        {deal.contactId && !contact && (
          <div className="flex items-start gap-2 mb-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>O contato vinculado foi removido. Edite o negocio para associar um novo contato.</span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent dark:bg-accent flex items-center justify-center text-xs font-bold">
            {(resolvedContactName || '?').charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {contact ? (
                <input
                  key={`name-${contact.id}`}
                  type="text"
                  defaultValue={contact.name || ''}
                  onBlur={e => {
                    const val = e.target.value.trim();
                    if (val && val !== contact.name) {
                      onUpdateContact(contact.id, { name: val });
                    }
                  }}
                  placeholder="Nome do contato"
                  className="text-foreground font-medium text-sm bg-transparent outline-none w-full placeholder:text-muted-foreground border border-transparent hover:border-border hover:bg-background dark:hover:bg-white/5 rounded px-1 py-0.5 transition-colors focus:ring-1 focus:ring-primary-500 focus:bg-white dark:focus:bg-white/5 focus:border-primary-500 cursor-text"
                />
              ) : (
                <span className="text-foreground font-medium text-sm">{resolvedContactName}</span>
              )}
              {contact?.stage &&
                (() => {
                  const stage = lifecycleStageById.get(contact.stage);
                  if (!stage) return null;
                  return (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-sm uppercase tracking-wider text-white ${stage.color}`}>
                      {stage.name}
                    </span>
                  );
                })()}
            </div>
            {/* Phone - editable inline */}
            <div className="flex items-center gap-1 mt-1">
              <Phone size={11} className="text-muted-foreground shrink-0" />
              <input
                key={`phone-${contact?.id}`}
                type="tel"
                defaultValue={contact?.phone || ''}
                onBlur={e => contact && onUpdateContact(contact.id, { phone: e.target.value })}
                placeholder="Telefone"
                className="text-xs text-secondary-foreground dark:text-muted-foreground bg-transparent outline-none w-full placeholder:text-muted-foreground hover:bg-background dark:hover:bg-white/5 rounded px-1 py-0.5 transition-colors focus:ring-1 focus:ring-primary-500 focus:bg-white dark:focus:bg-white/5"
              />
              {contact?.phone && (
                <Button
                  onClick={() => onCopyPhone(contact.phone || '')}
                  className="text-muted-foreground hover:text-primary-500 transition-colors shrink-0"
                  title="Copiar telefone"
                >
                  <Copy size={11} />
                </Button>
              )}
            </div>
            {/* Email - editable inline */}
            <div className="flex items-center gap-1 mt-0.5">
              <Mail size={11} className="text-muted-foreground shrink-0" />
              <input
                key={`email-${contact?.id}`}
                type="email"
                defaultValue={contact?.email || ''}
                onBlur={e => contact && onUpdateContact(contact.id, { email: e.target.value })}
                placeholder="Email"
                className="text-xs text-secondary-foreground dark:text-muted-foreground bg-transparent outline-none w-full placeholder:text-muted-foreground hover:bg-background dark:hover:bg-white/5 rounded px-1 py-0.5 transition-colors focus:ring-1 focus:ring-primary-500 focus:bg-white dark:focus:bg-white/5 truncate"
              />
            </div>
          </div>
        </div>

        {/* Temperature + Classification */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={contact?.temperature || ''}
            onChange={e => contact && onUpdateContact(contact.id, { temperature: (e.target.value || undefined) as ContactTemperature | undefined })}
            className={`text-[11px] font-semibold bg-transparent border border-border dark:border-border rounded-md px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer ${
              contact?.temperature === 'HOT' ? 'text-red-500' :
              contact?.temperature === 'WARM' ? 'text-amber-500' :
              contact?.temperature === 'COLD' ? 'text-blue-500' : 'text-muted-foreground'
            }`}
          >
            <option value="">Temperatura</option>
            <option value="HOT">Quente</option>
            <option value="WARM">Morno</option>
            <option value="COLD">Frio</option>
          </select>
          <select
            value={contact?.classification || ''}
            onChange={e => contact && onUpdateContact(contact.id, { classification: (e.target.value || undefined) as ContactClassification | undefined })}
            className="text-[11px] font-semibold bg-transparent border border-border dark:border-border rounded-md px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer text-secondary-foreground dark:text-muted-foreground"
          >
            <option value="">Classificacao</option>
            <option value="COMPRADOR">Comprador</option>
            <option value="VENDEDOR">Vendedor</option>
            <option value="LOCATARIO">Locatario</option>
            <option value="LOCADOR">Locador</option>
            <option value="INVESTIDOR">Investidor</option>
            <option value="PERMUTANTE">Permutante</option>
          </select>
        </div>

        {/* Lead Score bar */}
        {contact?.leadScore != null && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Score</span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-accent dark:bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${
                  contact.leadScore <= 30 ? 'bg-red-500' :
                  contact.leadScore <= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, contact.leadScore)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground">
              {contact.leadScore}
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                {contact.leadScore <= 30 ? 'Frio' : contact.leadScore <= 60 ? 'Morno' : 'Quente'}
              </span>
            </span>
          </div>
        )}
      </div>

      <SidebarPreferences
        contact={contact}
        preferences={preferences}
        onCreatePreferences={onCreatePreferences}
        onSetPreferences={onSetPreferences}
        onUpdatePreference={onUpdatePreference}
      />

      <SidebarDetails
        deal={deal}
        propertyRef={propertyRef}
        estimatedCommission={estimatedCommission}
        onUpdateDeal={onUpdateDeal}
        onPropertyRefChange={onPropertyRefChange}
      />

      {/* TAGS */}
      <div className="pt-3 border-t border-border">
        <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2 flex items-center gap-2">
          <TagIcon size={12} /> Tags
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {(contact?.tags || []).length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Sem tags.</p>
          ) : (
            (contact?.tags || []).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted dark:bg-white/5 text-secondary-foreground dark:text-muted-foreground border border-border"
              >
                {tag}
              </span>
            ))
          )}
        </div>
      </div>

      {/* CUSTOM FIELDS */}
      <CustomFieldsSection
        contact={contact}
        customFieldDefinitions={customFieldDefinitions}
      />
    </div>
  );
};

/* ---------- Custom Fields (small, kept inline) ---------- */

interface CustomFieldsSectionProps {
  contact: Contact | null;
  customFieldDefinitions: CustomFieldDefinition[];
}

const CustomFieldsSection: React.FC<CustomFieldsSectionProps> = ({
  contact,
  customFieldDefinitions,
}) => {
  const filledFields = customFieldDefinitions.filter(field => {
    const val = contact?.customFields?.[field.key];
    return val !== undefined && val !== null && val !== '';
  });
  if (filledFields.length === 0) return null;
  return (
    <div className="pt-3 border-t border-border">
      <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">
        Campos Personalizados
      </h3>
      <div className="space-y-1.5">
        {filledFields.map(field => (
          <div key={field.id} className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-muted-foreground dark:text-muted-foreground">
              {field.label}
            </span>
            <span className="text-[11px] text-secondary-foreground dark:text-muted-foreground truncate text-right">
              {String(contact?.customFields?.[field.key] ?? '')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
