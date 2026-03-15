'use client';

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { X, Phone as PhoneIcon, MessageCircle, Mail } from 'lucide-react';
import { useContact, useUpdateContact } from '@/lib/query/hooks/useContactsQuery';
import { supabase } from '@/lib/supabase/client';
import { contactPhonesService } from '@/lib/supabase/contacts';
import { contactPreferencesService } from '@/lib/supabase/contact-preferences';
import { useSettings } from '@/context/settings/SettingsContext';
import { useResponsiveMode } from '@/hooks/useResponsiveMode';
import { FocusTrap, useFocusReturn } from '@/lib/a11y';
import { Button } from '@/components/ui/button';
import { MODAL_OVERLAY_CLASS } from '@/components/ui/modalStyles';
import type { Contact, ContactPhone, ContactPreference, Deal, Activity } from '@/types';


import { ContactCockpitDataPanel } from '../cockpit/ContactCockpitDataPanel';
import { ContactCockpitTimeline } from '../cockpit/ContactCockpitTimeline';
import { ContactCockpitRightRail } from '../cockpit/ContactCockpitRightRail';
import { ContactCockpitPipelineBar } from '../cockpit/ContactCockpitPipelineBar';
import { CLASSIFICATION_LABELS, TEMPERATURE_CONFIG, STAGE_LABELS } from '../constants';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ContactDetailModalProps {
  contactId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component (wrapper)
// ---------------------------------------------------------------------------

export function ContactDetailModal({ contactId, isOpen, onClose }: ContactDetailModalProps) {
  if (!isOpen || !contactId) return null;
  return <ContactDetailModalInner contactId={contactId} onClose={onClose} />;
}

// ---------------------------------------------------------------------------
// Inner component (all hooks safe)
// ---------------------------------------------------------------------------

function ContactDetailModalInner({ contactId, onClose }: { contactId: string; onClose: () => void }) {
  const headingId = useId();
  useFocusReturn({ enabled: true });
  const { mode } = useResponsiveMode();
  const isMobile = mode === 'mobile';

  // ---- Data hooks ----
  const { data: contact, isLoading, refetch: refetchContact } = useContact(contactId);
  const updateContactMutation = useUpdateContact();
  const { availableTags: availableTagItems, addTag: addCatalogTag, customFieldDefinitions } = useSettings();
  const availableTags = availableTagItems.map(t => t.name);

  // ---- Parallel data state ----
  const [phones, setPhones] = useState<ContactPhone[]>([]);
  const [preferences, setPreferences] = useState<ContactPreference | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [dealActivities, setDealActivities] = useState<Activity[]>([]);
  const [contactActivities, setContactActivities] = useState<Activity[]>([]);
  const [notes, setNotes] = useState<Activity[]>([]);
  const [scoreHistory, setScoreHistory] = useState<{ id: string; old_score: number; new_score: number; change: number; created_at: string }[]>([]);
  const [isNotesLoading, setIsNotesLoading] = useState(false);

  // ---- Parallel data loading ----
  useEffect(() => {
    if (!contact || !supabase) return;
    let cancelled = false;

    const loadAll = async () => {
      const results = await Promise.allSettled([
        contactPhonesService.getByContactId(contactId),
        contactPreferencesService.getByContactId(contactId),
        supabase
          .from('deals')
          .select('*')
          .eq('contact_id', contactId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        supabase
          .from('lead_score_history')
          .select('id, old_score, new_score, change, created_at')
          .eq('contact_id', contactId)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (cancelled) return;

      const phonesResult = results[0].status === 'fulfilled' ? results[0].value : { data: [] };
      const prefResult = results[1].status === 'fulfilled' ? results[1].value : { data: [] };
      const dealsResult = results[2].status === 'fulfilled' ? results[2].value : { data: [] };
      const scoreHistoryResult = results[3].status === 'fulfilled' ? results[3].value : { data: [] };

      setPhones(phonesResult.data || []);
      const prefArray = prefResult.data;
      setPreferences(prefArray && (prefArray as ContactPreference[]).length > 0 ? (prefArray as ContactPreference[])[0] : null);
      const fetchedDeals = (dealsResult?.data as Deal[]) || [];
      setDeals(fetchedDeals);
      setScoreHistory((scoreHistoryResult?.data as typeof scoreHistory) || []);

      // Secondary: activities (by deal + by contact) + notes
      const dealIds = fetchedDeals.map((d) => d.id);
      const secondaryResults = await Promise.allSettled([
        dealIds.length > 0
          ? supabase.from('activities').select('*').in('deal_id', dealIds).is('deleted_at', null).order('date', { ascending: false }).limit(100)
          : Promise.resolve({ data: [] }),
        supabase.from('activities').select('*').eq('contact_id', contactId).is('deleted_at', null).order('date', { ascending: false }).limit(100),
      ]);

      if (cancelled) return;
      setDealActivities((secondaryResults[0].status === 'fulfilled' ? secondaryResults[0].value : { data: [] })?.data as Activity[] || []);
      const contactActs = (secondaryResults[1].status === 'fulfilled' ? secondaryResults[1].value : { data: [] })?.data as Activity[] || [];
      setContactActivities(contactActs);
      setNotes(contactActs.filter(a => a.type === 'NOTE'));
    };

    loadAll();
    return () => { cancelled = true; };
  }, [contact, contactId]);

  // ---- Refresh functions ----
  const refreshPreferences = useCallback(() => {
    contactPreferencesService.getByContactId(contactId)
      .then(({ data }) => {
        const arr = data as ContactPreference[] | null;
        setPreferences(arr && arr.length > 0 ? arr[0] : null);
      })
      .catch(err => console.error('[ContactModal] refresh preferences failed:', err));
  }, [contactId]);

  // Re-fetch preferences when AI tools mutate data
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.tool === 'createContactPreference' || detail?.tool === 'updateContactPreference') {
        refreshPreferences();
      }
    };
    window.addEventListener('zmob:data-mutated', handler);
    return () => window.removeEventListener('zmob:data-mutated', handler);
  }, [refreshPreferences]);

  const refreshActivities = useCallback(async () => {
    if (!supabase) return;
    const dealIds = deals.map((d) => d.id);
    const results = await Promise.allSettled([
      dealIds.length > 0
        ? supabase.from('activities').select('*').in('deal_id', dealIds).is('deleted_at', null).order('date', { ascending: false }).limit(100)
        : Promise.resolve({ data: [] }),
      supabase.from('activities').select('*').eq('contact_id', contactId).is('deleted_at', null).order('date', { ascending: false }).limit(100),
    ]);
    setDealActivities((results[0].status === 'fulfilled' ? results[0].value : { data: [] })?.data as Activity[] || []);
    setContactActivities((results[1].status === 'fulfilled' ? results[1].value : { data: [] })?.data as Activity[] || []);
  }, [deals, contactId]);

  const refreshNotes = useCallback(async () => {
    if (!supabase) return;
    setIsNotesLoading(true);
    const { data } = await supabase.from('activities').select('*').eq('contact_id', contactId).eq('type', 'NOTE').is('deleted_at', null).order('date', { ascending: false });
    setNotes((data as Activity[]) || []);
    setIsNotesLoading(false);
  }, [contactId]);

  // ---- Preference handlers ----
  const emitPreferenceChange = useCallback((tool: string) => {
    window.dispatchEvent(new CustomEvent('zmob:data-mutated', { detail: { tool } }));
  }, []);

  const handleUpdatePreferences = useCallback(async (updates: Partial<ContactPreference>) => {
    if (!preferences?.id) return;
    await contactPreferencesService.update(preferences.id, updates);
    setPreferences(p => p ? { ...p, ...updates } : p);
    emitPreferenceChange('updateContactPreference');
  }, [preferences?.id, emitPreferenceChange]);

  const handleCreatePreferences = useCallback(async (initialData?: Partial<ContactPreference>) => {
    if (!contact?.organizationId) return;
    const { data, error } = await contactPreferencesService.create({
      contactId,
      organizationId: contact.organizationId,
      propertyTypes: initialData?.propertyTypes || [],
      purpose: initialData?.purpose || null,
      priceMin: initialData?.priceMin ?? null,
      priceMax: initialData?.priceMax ?? null,
      regions: initialData?.regions || [],
      bedroomsMin: initialData?.bedroomsMin ?? null,
      parkingMin: initialData?.parkingMin ?? null,
      areaMin: initialData?.areaMin ?? null,
      acceptsFinancing: initialData?.acceptsFinancing ?? null,
      acceptsFgts: initialData?.acceptsFgts ?? null,
      urgency: initialData?.urgency || null,
      notes: initialData?.notes || null,
    });
    if (error) { console.error('[ContactModal] createPreferences failed:', error); return; }
    if (data) setPreferences(data);
    emitPreferenceChange('createContactPreference');
  }, [contactId, contact?.organizationId, emitPreferenceChange]);

  // ---- Tag handlers ----
  const handleAddTag = useCallback(async (tag: string) => {
    if (!contact) return;
    const nextTags = [...(contact.tags || []), tag];
    try {
      await updateContactMutation.mutateAsync({ id: contact.id, updates: { tags: nextTags } });
      addCatalogTag(tag);
      refetchContact();
    } catch (e) { console.error('Failed to add tag:', e); }
  }, [contact, refetchContact, updateContactMutation, addCatalogTag]);

  const handleRemoveTag = useCallback(async (tag: string) => {
    if (!contact) return;
    const nextTags = (contact.tags || []).filter(t => t !== tag);
    try {
      await updateContactMutation.mutateAsync({ id: contact.id, updates: { tags: nextTags } });
      refetchContact();
    } catch (e) { console.error('Failed to remove tag:', e); }
  }, [contact, refetchContact, updateContactMutation]);

  // ---- Custom field handler ----
  const handleUpdateCustomField = useCallback(async (key: string, value: string) => {
    if (!contact) return;
    const updatedFields = { ...(contact.customFields || {}), [key]: value };
    try {
      await updateContactMutation.mutateAsync({ id: contact.id, updates: { customFields: updatedFields } });
      refetchContact();
    } catch (e) { console.error('Failed to update custom field:', e); }
  }, [contact, refetchContact, updateContactMutation]);

  // ---- Stage change ----
  const handleStageChange = useCallback(async (newStage: string) => {
    if (!contact || contact.stage === newStage) return;
    try {
      await updateContactMutation.mutateAsync({ id: contact.id, updates: { stage: newStage } });
      refetchContact();
    } catch (e) { console.error('Failed to update stage:', e); }
  }, [contact, refetchContact, updateContactMutation]);

  // ---- Inline update handler ----
  const handleInlineUpdate = useCallback(async (updates: Partial<Contact>) => {
    if (!contact) return;
    try {
      await updateContactMutation.mutateAsync({ id: contact.id, updates });
      refetchContact();
    } catch (e) { console.error('Failed to inline update:', e); }
  }, [contact, refetchContact, updateContactMutation]);

  // ---- Open deal handler (navega para boards com deal aberto) ----
  const router = useRouter();
  const handleOpenDeal = useCallback((dealId: string) => {
    onClose();
    router.push(`/boards?deal=${dealId}`);
  }, [onClose, router]);

  // ---- Merged & deduplicated activities ----
  const mergedActivities = useMemo(() => {
    const map = new Map<string, Activity>();
    for (const a of dealActivities) map.set(a.id, a);
    for (const a of contactActivities) {
      if (!map.has(a.id)) map.set(a.id, a);
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [dealActivities, contactActivities]);

  // ---- Timeline entries ----
  const timelineEntries = useMemo(() => {
    const dealsMap = new Map(deals.map((d) => [d.id, d]));
    const activityEntries = mergedActivities.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      date: a.date,
      dealTitle: (a.dealId ? dealsMap.get(a.dealId)?.title : '') || '',
      dealId: a.dealId || '',
      metadata: a.metadata,
    }));
    const scoreEntries = scoreHistory.map((s) => {
      const sign = s.change > 0 ? '+' : '';
      return {
        id: s.id,
        type: 'SCORE_CHANGE' as const,
        title: `Score: ${s.old_score} → ${s.new_score} (${sign}${s.change})`,
        description: undefined as string | undefined,
        date: s.created_at,
        dealTitle: '',
        dealId: '',
        scoreChange: s.change,
      };
    });
    return [...activityEntries, ...scoreEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [mergedActivities, deals, scoreHistory]);

  // ---- Contact snapshot for AI ----
  const contactSnapshot = useMemo(() => {
    if (!contact) return undefined;
    return {
      meta: { generatedAt: new Date().toISOString(), source: 'contact-detail-modal', version: 1 },
      contact: {
        id: contact.id, name: contact.name, email: contact.email, phone: contact.phone,
        stage: contact.stage, status: contact.status, classification: contact.classification,
        temperature: contact.temperature, contactType: contact.contactType, source: contact.source,
        cpf: contact.cpf, addressCity: contact.addressCity, addressState: contact.addressState,
        notes: contact.notes, totalValue: contact.totalValue,
      },
      deals: deals.map((d) => ({
        id: d.id, title: d.title, value: d.value, dealType: d.dealType,
        probability: d.probability, isWon: d.isWon, isLost: d.isLost,
      })),
      preferences: preferences ? {
        propertyTypes: preferences.propertyTypes, purpose: preferences.purpose,
        priceMin: preferences.priceMin, priceMax: preferences.priceMax,
        regions: preferences.regions, urgency: preferences.urgency,
      } : null,
      phonesCount: phones.length,
      activitiesCount: mergedActivities.length,
      notesCount: notes.length,
    };
  }, [contact, deals, preferences, phones, mergedActivities, notes]);

  // ---- Loading state ----
  if (isLoading || !contact) {
    return (
      <div
        className={MODAL_OVERLAY_CLASS}
        onClick={onClose}
      >
        <div className="max-w-xl w-full rounded-2xl border border-border bg-white dark:bg-card p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-semibold text-foreground dark:text-muted-foreground">Carregando contato...</div>
            <Button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:text-secondary-foreground dark:hover:text-muted-foreground hover:bg-muted dark:hover:bg-white/5">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            <div className="h-4 w-2/3 rounded bg-accent dark:bg-white/10 animate-pulse" />
            <div className="h-4 w-full rounded bg-accent dark:bg-white/10 animate-pulse" />
            <div className="h-4 w-5/6 rounded bg-accent dark:bg-white/10 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ---- Derived values ----
  const tempConfig = TEMPERATURE_CONFIG[contact.temperature || 'WARM'] || TEMPERATURE_CONFIG.WARM;
  const initials = contact.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  // Primary phone for action buttons
  const primaryPhone = phones.find(p => p.isPrimary) || phones[0];
  const whatsappPhone = phones.find(p => p.isWhatsapp) || primaryPhone;
  const phoneNumber = primaryPhone?.phoneNumber || contact.phone;
  const waNumber = whatsappPhone?.phoneNumber || phoneNumber;

  return (
    <FocusTrap active onEscape={onClose} clickOutsideDeactivates>
      {/* Overlay */}
      <div
        className={MODAL_OVERLAY_CLASS}
        onClick={onClose}
      >
        {/* Panel */}
        <div
          className={`flex flex-col overflow-hidden bg-white dark:bg-background text-foreground dark:text-muted-foreground border border-border  shadow-2xl ${
            isMobile
              ? 'fixed inset-0 rounded-none'
              : 'relative max-w-7xl w-[95vw] h-[90vh] rounded-2xl'
          }`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={headingId}
        >
          {/* ---- HEADER ---- */}
          <div className="sticky top-0 z-40 border-b border-border bg-background/80 dark:bg-black/40 backdrop-blur shrink-0">
            <div className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-4 min-w-0">
                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-cyan-500/20 dark:to-violet-500/20 ring-1 ring-ring dark:ring-white/10">
                  {contact.avatar ? (
                    <Image src={contact.avatar} alt={contact.name} width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-primary-700 dark:text-muted-foreground">{initials}</span>
                  )}
                </div>

                {/* Name + badges */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2" id={headingId}>
                    <h1 className="text-sm font-semibold text-foreground dark:text-muted-foreground truncate">{contact.name}</h1>
                    {contact.classification && (
                      <span className="inline-flex items-center rounded-full bg-muted dark:bg-white/[0.08] px-2.5 py-0.5 text-2xs font-semibold text-secondary-foreground dark:text-muted-foreground ring-1 ring-ring dark:ring-white/10">
                        {CLASSIFICATION_LABELS[contact.classification] || contact.classification}
                      </span>
                    )}
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-2xs font-semibold ${tempConfig.cls}`}>
                      {tempConfig.label}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-2xs font-semibold text-cyan-700 dark:text-cyan-300 ring-1 ring-cyan-500/20">
                      {STAGE_LABELS[contact.stage] || contact.stage}
                    </span>
                  </div>
                  <div className="mt-0.5 text-1xs text-muted-foreground dark:text-muted-foreground">
                    {contact.email || 'Sem email'} | {contact.phone || 'Sem telefone'}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Phone */}
                {phoneNumber && (
                  <a
                    href={`tel:${phoneNumber}`}
                    className="rounded-lg border border-border bg-muted dark:bg-white/[0.03] p-2 hover:bg-accent dark:hover:bg-white/5 transition-colors"
                    title={`Ligar: ${phoneNumber}`}
                  >
                    <PhoneIcon className="h-4 w-4 text-green-400" />
                  </a>
                )}
                {/* WhatsApp */}
                {waNumber && (
                  <a
                    href={`https://wa.me/${waNumber.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-border bg-muted dark:bg-white/[0.03] p-2 hover:bg-accent dark:hover:bg-white/5 transition-colors"
                    title={`WhatsApp: ${waNumber}`}
                  >
                    <MessageCircle className="h-4 w-4 text-green-400" />
                  </a>
                )}
                {/* Email */}
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="rounded-lg border border-border bg-muted dark:bg-white/[0.03] p-2 hover:bg-accent dark:hover:bg-white/5 transition-colors"
                    title={`Email: ${contact.email}`}
                  >
                    <Mail className="h-4 w-4 text-amber-400" />
                  </a>
                )}
                {/* Close */}
                <Button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-border bg-muted dark:bg-white/[0.03] p-2 hover:bg-accent dark:hover:bg-white/5"
                  title="Fechar"
                >
                  <X className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
                </Button>
              </div>
            </div>

            {/* Pipeline bar */}
            <div className="px-6">
              <ContactCockpitPipelineBar
                currentStage={contact.stage}
                onStageChange={handleStageChange}
              />
            </div>
          </div>

          {/* ---- 3-COLUMN GRID ---- */}
          <div className="flex-1 min-h-0 w-full overflow-hidden px-6 py-4">
            <div className={`h-full min-h-0 gap-4 ${
              isMobile
                ? 'flex flex-col overflow-auto'
                : 'grid lg:grid-cols-[340px_1fr_400px] overflow-hidden'
            }`}>
              {/* Left: DataPanel with inline editing */}
              <ContactCockpitDataPanel
                contact={contact}
                phones={phones}
                preferences={preferences}
                availableTags={availableTags}
                tagItems={availableTagItems}
                customFieldDefinitions={customFieldDefinitions}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
                onUpdateCustomField={handleUpdateCustomField}
                onUpdateContact={handleInlineUpdate}
                onUpdatePreference={handleUpdatePreferences}
                onCreatePreference={handleCreatePreferences}
              />

              {/* Center: Timeline */}
              <div className="min-h-0 overflow-auto">
              <ContactCockpitTimeline
                activities={timelineEntries}
                contactId={contactId}
                contactName={contact.name}
                firstDealId={deals[0]?.id || null}
                firstDealTitle={deals[0]?.title || null}
                onNoteCreated={() => {
                  refreshActivities();
                  refreshNotes();
                }}
              />
              </div>

              {/* Right: RightRail */}
              <ContactCockpitRightRail
                contact={contact}
                deals={deals}
                notes={notes}
                isNotesLoading={isNotesLoading}
                onNoteCreated={() => { refreshNotes(); refreshActivities(); }}
                onNoteDeleted={() => { refreshNotes(); refreshActivities(); }}
                contactSnapshot={contactSnapshot}
                onOpenDeal={handleOpenDeal}
              />
            </div>
          </div>
        </div>

      </div>
    </FocusTrap>
  );
}
