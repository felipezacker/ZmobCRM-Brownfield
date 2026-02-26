'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, User } from 'lucide-react';
import { useContact } from '@/lib/query/hooks/useContactsQuery';
import { supabase } from '@/lib/supabase/client';
import { contactPhonesService } from '@/lib/supabase/contacts';
import { contactPreferencesService } from '@/lib/supabase/contact-preferences';
import { Button } from '@/app/components/ui/Button';
import { Chip } from '@/features/deals/cockpit/cockpit-ui';
import { formatCurrencyBRL } from '@/features/deals/cockpit/cockpit-utils';
import type { Contact, ContactPhone, ContactPreference, Deal, Activity } from '@/types';
import type { DealNote } from '@/lib/supabase/dealNotes';

import { ContactCockpitDataPanel } from './ContactCockpitDataPanel';
import { ContactCockpitTimeline } from './ContactCockpitTimeline';
import { ContactCockpitRightRail } from './ContactCockpitRightRail';
import { ContactCockpitPipelineBar } from './ContactCockpitPipelineBar';
import { ContactFormModal, type ContactFormData } from '@/features/contacts/components/ContactFormModal';
import { useUpdateContact } from '@/lib/query/hooks/useContactsQuery';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CLASSIFICATION_LABELS: Record<string, string> = {
  COMPRADOR: 'Comprador',
  VENDEDOR: 'Vendedor',
  LOCATARIO: 'Locatario',
  LOCADOR: 'Locador',
  INVESTIDOR: 'Investidor',
  PERMUTANTE: 'Permutante',
};

const TEMPERATURE_CONFIG: Record<string, { label: string; cls: string }> = {
  HOT: { label: 'Quente', cls: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/20' },
  WARM: { label: 'Morno', cls: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20' },
  COLD: { label: 'Frio', cls: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20' },
};

const STAGE_LABELS: Record<string, string> = {
  LEAD: 'Lead',
  MQL: 'MQL',
  PROSPECT: 'Prospect',
  CUSTOMER: 'Cliente',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ContactCockpitClientProps {
  contactId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContactCockpitClient({ contactId }: ContactCockpitClientProps) {
  const router = useRouter();
  const { data: contact, isLoading, refetch: refetchContact } = useContact(contactId);
  const updateContactMutation = useUpdateContact();

  // ---- Parallel data state ----
  const [phones, setPhones] = useState<ContactPhone[]>([]);
  const [preferences, setPreferences] = useState<ContactPreference | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notes, setNotes] = useState<DealNote[]>([]);
  const [isNotesLoading, setIsNotesLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // ---- Edit modal ----
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    ownerId: undefined,
    cascadeDeals: false,
    birthDate: '',
    source: '',
    notes: '',
    cpf: '',
    contactType: 'PF',
    classification: '',
    temperature: 'WARM',
    addressCep: '',
    addressCity: '',
    addressState: '',
    phones: [],
  });

  // ---- Parallel data loading (AC 12) ----
  useEffect(() => {
    if (!contact || !supabase) return;
    let cancelled = false;

    const loadAll = async () => {
      const [phonesResult, prefResult, dealsResult] = await Promise.all([
        contactPhonesService.getByContactId(contactId),
        contactPreferencesService.getByContactId(contactId),
        supabase
          .from('deals')
          .select('*')
          .eq('contact_id', contactId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
      ]);

      if (cancelled) return;

      setPhones(phonesResult.data || []);

      // preferences returns an array; take first if exists
      const prefArray = prefResult.data;
      setPreferences(prefArray && prefArray.length > 0 ? prefArray[0] : null);

      const fetchedDeals = (dealsResult?.data as Deal[]) || [];
      setDeals(fetchedDeals);

      // Fetch activities for linked deals + notes
      const dealIds = fetchedDeals.map((d) => d.id);

      const [activitiesResult, notesResult] = await Promise.all([
        dealIds.length > 0
          ? supabase
              .from('activities')
              .select('*')
              .in('deal_id', dealIds)
              .is('deleted_at', null)
              .order('date', { ascending: false })
              .limit(100)
          : Promise.resolve({ data: [] }),
        dealIds.length > 0
          ? supabase
              .from('deal_notes')
              .select('*')
              .in('deal_id', dealIds)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);

      if (cancelled) return;

      setActivities((activitiesResult?.data as Activity[]) || []);
      setNotes((notesResult?.data as DealNote[]) || []);
      setDataLoaded(true);
    };

    loadAll();

    return () => {
      cancelled = true;
    };
  }, [contact, contactId]);

  // ---- Refresh functions ----
  const refreshActivities = useCallback(async () => {
    if (!supabase || deals.length === 0) return;
    const dealIds = deals.map((d) => d.id);
    const { data } = await supabase
      .from('activities')
      .select('*')
      .in('deal_id', dealIds)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .limit(100);
    setActivities((data as Activity[]) || []);
  }, [deals]);

  const refreshNotes = useCallback(async () => {
    if (!supabase || deals.length === 0) return;
    setIsNotesLoading(true);
    const dealIds = deals.map((d) => d.id);
    const { data } = await supabase
      .from('deal_notes')
      .select('*')
      .in('deal_id', dealIds)
      .order('created_at', { ascending: false });
    setNotes((data as DealNote[]) || []);
    setIsNotesLoading(false);
  }, [deals]);

  // ---- Stage change (AC 10) ----
  const handleStageChange = useCallback(
    async (newStage: string) => {
      if (!contact || contact.stage === newStage) return;
      try {
        await updateContactMutation.mutateAsync({
          id: contact.id,
          updates: { stage: newStage },
        });
        refetchContact();
      } catch (e) {
        console.error('Failed to update stage:', e);
      }
    },
    [contact, refetchContact, updateContactMutation]
  );

  // ---- Edit handler (AC 9) ----
  const handleOpenEdit = useCallback(() => {
    if (!contact) return;
    setFormData({
      name: contact.name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      ownerId: contact.ownerId,
      cascadeDeals: false,
      birthDate: contact.birthDate || '',
      source: (contact.source as ContactFormData['source']) || '',
      notes: contact.notes || '',
      cpf: contact.cpf || '',
      contactType: contact.contactType || 'PF',
      classification: (contact.classification as ContactFormData['classification']) || '',
      temperature: contact.temperature || 'WARM',
      addressCep: contact.addressCep || '',
      addressCity: contact.addressCity || '',
      addressState: contact.addressState || '',
      phones: phones.map((p) => ({
        id: p.id,
        phoneNumber: p.phoneNumber,
        phoneType: p.phoneType,
        isWhatsapp: p.isWhatsapp,
        isPrimary: p.isPrimary,
      })),
    });
    setIsEditOpen(true);
  }, [contact, phones]);

  const handleEditSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!contact) return;
      try {
        await updateContactMutation.mutateAsync({
          id: contact.id,
          updates: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            ownerId: formData.ownerId,
            birthDate: formData.birthDate || undefined,
            source: (formData.source as Contact['source']) || undefined,
            notes: formData.notes || undefined,
            cpf: formData.cpf || undefined,
            contactType: formData.contactType,
            classification: (formData.classification as Contact['classification']) || undefined,
            temperature: formData.temperature,
            addressCep: formData.addressCep || undefined,
            addressCity: formData.addressCity || undefined,
            addressState: formData.addressState || undefined,
          },
        });
        setIsEditOpen(false);
        refetchContact();
      } catch (e) {
        console.error('Failed to update contact:', e);
      }
    },
    [contact, formData, refetchContact, updateContactMutation]
  );

  // ---- Timeline entries ----
  const timelineEntries = useMemo(() => {
    const dealsMap = new Map(deals.map((d) => [d.id, d]));
    return activities.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      date: a.date,
      dealTitle: dealsMap.get(a.dealId)?.title || '',
      dealId: a.dealId,
    }));
  }, [activities, deals]);

  // ---- Contact snapshot for AI (AC 7) ----
  const contactSnapshot = useMemo(() => {
    if (!contact) return undefined;
    return {
      meta: { generatedAt: new Date().toISOString(), source: 'contact-cockpit', version: 1 },
      contact: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        stage: contact.stage,
        status: contact.status,
        classification: contact.classification,
        temperature: contact.temperature,
        contactType: contact.contactType,
        source: contact.source,
        cpf: contact.cpf,
        addressCity: contact.addressCity,
        addressState: contact.addressState,
        notes: contact.notes,
        totalValue: contact.totalValue,
      },
      deals: deals.map((d) => ({
        id: d.id,
        title: d.title,
        value: d.value,
        dealType: d.dealType,
        probability: d.probability,
        isWon: d.isWon,
        isLost: d.isLost,
      })),
      preferences: preferences
        ? {
            propertyTypes: preferences.propertyTypes,
            purpose: preferences.purpose,
            priceMin: preferences.priceMin,
            priceMax: preferences.priceMax,
            regions: preferences.regions,
            urgency: preferences.urgency,
          }
        : null,
      phonesCount: phones.length,
      activitiesCount: activities.length,
      notesCount: notes.length,
    };
  }, [contact, deals, preferences, phones, activities, notes]);

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className="fixed inset-0 md:left-[var(--app-sidebar-width,0px)] z-[9999] flex flex-col items-center justify-center bg-slate-950 text-slate-100">
        <div className="max-w-xl w-full rounded-2xl border border-white/10 bg-white/3 p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-semibold">Cockpit do Contato</div>
            <div className="text-xs text-slate-400">Carregando...</div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="h-4 w-2/3 rounded bg-white/10 animate-pulse" />
            <div className="h-4 w-full rounded bg-white/10 animate-pulse" />
            <div className="h-4 w-5/6 rounded bg-white/10 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="fixed inset-0 md:left-[var(--app-sidebar-width,0px)] z-[9999] flex flex-col items-center justify-center bg-slate-950 text-slate-100">
        <div className="max-w-xl w-full rounded-2xl border border-white/10 bg-white/3 p-6">
          <div className="text-lg font-semibold">Contato nao encontrado</div>
          <div className="mt-3 text-sm text-slate-300">
            O contato solicitado nao existe ou foi removido.
          </div>
          <div className="mt-4">
            <Button
              type="button"
              className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100"
              onClick={() => router.push('/contacts')}
            >
              Voltar para lista
            </Button>
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

  return (
    <div className="fixed inset-0 md:left-[var(--app-sidebar-width,0px)] z-[9999] flex flex-col overflow-hidden bg-slate-950 text-slate-100">
      {/* ---- HEADER (AC 9) ---- */}
      <div className="sticky top-0 z-40 border-b border-white/5 bg-black/40 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-3 2xl:px-10">
          <div className="flex items-center gap-4 min-w-0">
            {/* Back button (AC 11) */}
            <Button
              type="button"
              className="shrink-0 rounded-xl border border-white/10 bg-white/3 p-2 hover:bg-white/5"
              onClick={() => router.push('/contacts')}
              title="Voltar para lista"
            >
              <ArrowLeft className="h-4 w-4 text-slate-300" />
            </Button>

            {/* Avatar */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 ring-1 ring-white/10">
              {contact.avatar ? (
                <img
                  src={contact.avatar}
                  alt={contact.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-slate-300">{initials}</span>
              )}
            </div>

            {/* Name + badges */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-slate-100 truncate">
                  {contact.name}
                </h1>

                {/* Classification badge */}
                {contact.classification && (
                  <span className="inline-flex items-center rounded-full bg-white/8 px-2.5 py-0.5 text-[10px] font-semibold text-slate-300 ring-1 ring-white/10">
                    {CLASSIFICATION_LABELS[contact.classification] || contact.classification}
                  </span>
                )}

                {/* Temperature badge */}
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${tempConfig.cls}`}
                >
                  {tempConfig.label}
                </span>

                {/* Stage badge */}
                <span className="inline-flex items-center rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-300 ring-1 ring-cyan-500/20">
                  {STAGE_LABELS[contact.stage] || contact.stage}
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                {contact.email || 'Sem email'} | {contact.phone || 'Sem telefone'}
              </div>
            </div>
          </div>

          {/* Edit button (AC 9) */}
          <Button
            type="button"
            className="shrink-0 rounded-xl border border-white/10 bg-white/3 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 flex items-center gap-1.5"
            onClick={handleOpenEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
        </div>

        {/* Pipeline bar (AC 10) */}
        <div className="px-6 2xl:px-10">
          <ContactCockpitPipelineBar
            currentStage={contact.stage}
            onStageChange={handleStageChange}
          />
        </div>
      </div>

      {/* ---- 3-COLUMN GRID (AC 1) ---- */}
      <div className="flex-1 min-h-0 w-full overflow-hidden px-6 py-4 2xl:px-10">
        <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[360px_1fr_420px] lg:items-stretch">
          {/* Left rail (AC 2) */}
          <ContactCockpitDataPanel
            contact={contact}
            phones={phones}
            preferences={preferences}
          />

          {/* Center — Timeline (AC 3, AC 4) */}
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

          {/* Right rail (AC 5, 6, 7, 8) */}
          <ContactCockpitRightRail
            contact={contact}
            deals={deals}
            notes={notes}
            isNotesLoading={isNotesLoading}
            onNoteCreated={refreshNotes}
            onNoteDeleted={() => refreshNotes()}
            contactSnapshot={contactSnapshot}
          />
        </div>
      </div>

      {/* ---- Edit Modal (AC 9) ---- */}
      <ContactFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleEditSubmit}
        formData={formData}
        setFormData={setFormData}
        editingContact={contact}
      />
    </div>
  );
}
