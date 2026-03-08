'use client';

import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { Panel } from '@/features/deals/cockpit/cockpit-ui';
import type { DealView, Contact, ContactPreference, CustomFieldDefinition, Product } from '@/types';

import { ContactSection } from '@/features/deals/cockpit/components/ContactSection';
import { ProductsSection } from '@/features/deals/cockpit/components/ProductsSection';
import { PreferencesSection } from '@/features/deals/cockpit/components/PreferencesSection';
import { DealSection } from '@/features/deals/cockpit/components/DealSection';
import { CustomFieldsSection } from '@/features/deals/cockpit/components/CustomFieldsSection';
import { TagsSection } from '@/features/deals/cockpit/components/TagsSection';

export interface CockpitDataPanelProps {
  deal: DealView;
  contact: Contact | null;
  phoneE164: string | null;
  onCopy: (label: string, text: string) => void;
  estimatedCommission?: { rate: number; estimated: number } | null;
  preferences: ContactPreference | null;
  customFieldDefinitions: CustomFieldDefinition[];
  onUpdateDeal?: (updates: Record<string, any>) => void;
  onUpdateContact?: (updates: Partial<Contact>) => void;
  onUpdatePreferences?: (updates: Partial<ContactPreference>) => void;
  onCreatePreferences?: () => void;
  products?: Product[];
  onAddItem?: (item: { productId?: string; name: string; price: number; quantity: number }) => void;
  onRemoveItem?: (itemId: string) => void;
}

/** Main orchestrator for the CockpitDataPanel. Owns collapse state, delegates rendering to sub-components. */
export function CockpitDataPanel({
  deal,
  contact,
  phoneE164,
  onCopy,
  estimatedCommission,
  preferences,
  customFieldDefinitions,
  onUpdateDeal,
  onUpdateContact,
  onUpdatePreferences,
  onCreatePreferences,
  products,
  onAddItem,
  onRemoveItem,
}: CockpitDataPanelProps) {
  const contactRecord = contact as Record<string, unknown> | null;
  const tags = (contactRecord?.tags ?? undefined) as string[] | undefined;
  const customFields = (contactRecord?.customFields ?? undefined) as Record<string, unknown> | undefined;

  // Collapsible sections -- Contato & Deal expanded by default
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    contato: false,
    produtos: true,
    preferencias: true,
    deal: false,
    customFields: true,
    tags: true,
  });
  const toggleSection = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  // Filter custom field definitions to only those that have values
  const filledCustomFields = customFieldDefinitions.filter(
    (def) => customFields && customFields[def.key] !== undefined && customFields[def.key] !== null && customFields[def.key] !== ''
  );

  return (
    <Panel
      title="Dados"
      icon={<FileText className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />}
      className="flex min-h-0 flex-1 flex-col"
      bodyClassName="min-h-0 flex-1 overflow-auto"
    >
      <div key={`${deal.id}-${contact?.id ?? ''}-${preferences?.id ?? ''}`} className="flex min-h-0 flex-col gap-4">
        <ContactSection
          contact={contact}
          phoneE164={phoneE164}
          collapsed={collapsed.contato}
          onToggle={() => toggleSection('contato')}
          onCopy={onCopy}
          onUpdateContact={onUpdateContact}
          onUpdateDeal={onUpdateDeal}
        />

        <ProductsSection
          items={deal.items}
          collapsed={collapsed.produtos}
          onToggle={() => toggleSection('produtos')}
          products={products}
          onAddItem={onAddItem}
          onRemoveItem={onRemoveItem}
        />

        <PreferencesSection
          preferences={preferences}
          collapsed={collapsed.preferencias}
          onToggle={() => toggleSection('preferencias')}
          onUpdatePreferences={onUpdatePreferences}
          onCreatePreferences={onCreatePreferences}
        />

        <DealSection
          deal={deal}
          collapsed={collapsed.deal}
          onToggle={() => toggleSection('deal')}
          estimatedCommission={estimatedCommission}
          onUpdateDeal={onUpdateDeal}
        />

        <CustomFieldsSection
          customFields={customFields}
          filledCustomFields={filledCustomFields}
          collapsed={collapsed.customFields}
          onToggle={() => toggleSection('customFields')}
        />

        <TagsSection
          tags={tags}
          collapsed={collapsed.tags}
          onToggle={() => toggleSection('tags')}
        />
      </div>
    </Panel>
  );
}
