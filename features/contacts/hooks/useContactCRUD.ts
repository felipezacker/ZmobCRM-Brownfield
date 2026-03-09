import { useState, useRef, useCallback } from 'react';
import { Contact, ContactStage, ContactPreference } from '@/types';
import { useCreateContact, useUpdateContact, useDeleteContact, useContactHasDeals } from '@/lib/query/hooks/useContactsQuery';
import { useReassignContactWithDeals } from '@/hooks/useReassignContactWithDeals';
import { normalizePhoneE164 } from '@/lib/phone';
import { contactPhonesService } from '@/lib/supabase/contacts';
import { contactPreferencesService } from '@/lib/supabase/contact-preferences';
import { unformatCPF, formatCPF, formatCEP } from '@/lib/validations/cpf-cep';
import type { ContactFormData, PhoneFormEntry } from '@/features/contacts/components/ContactFormModal';

async function syncPhones(contactId: string, phones: PhoneFormEntry[]) {
  const { data: existingPhones } = await contactPhonesService.getByContactId(contactId);
  const existing = existingPhones || [];
  if (phones.length === 0 && existing.length === 0) return;
  const formIds = new Set(phones.map(p => p.id));
  const existingIds = new Set(existing.map(p => p.id));
  for (const ph of existing) { if (!formIds.has(ph.id)) await contactPhonesService.delete(ph.id); }
  for (const ph of phones) {
    if (ph.id.startsWith('temp-')) {
      await contactPhonesService.create({ contactId, phoneNumber: ph.phoneNumber, phoneType: ph.phoneType, isWhatsapp: ph.isWhatsapp, isPrimary: ph.isPrimary });
    }
  }
  for (const ph of phones) {
    if (!ph.id.startsWith('temp-') && existingIds.has(ph.id)) {
      const old = existing.find(p => p.id === ph.id);
      if (old && (old.phoneNumber !== ph.phoneNumber || old.phoneType !== ph.phoneType || old.isWhatsapp !== ph.isWhatsapp || old.isPrimary !== ph.isPrimary)) {
        await contactPhonesService.update(ph.id, { phoneNumber: ph.phoneNumber, phoneType: ph.phoneType, isWhatsapp: ph.isWhatsapp, isPrimary: ph.isPrimary });
      }
    }
  }
}

const emptyFormData: ContactFormData = {
  name: '', email: '', phone: '', ownerId: undefined, cascadeDeals: false, birthDate: '', source: '', notes: '',
  cpf: '', contactType: 'PF', classification: '', temperature: 'WARM', addressCep: '', addressCity: '', addressState: '', phones: [],
};

/** Build the extra-fields update payload from formData (reused in edit paths). */
function buildExtraFields(fd: ContactFormData) {
  return {
    birthDate: fd.birthDate || undefined, source: fd.source || undefined, notes: fd.notes || undefined,
    cpf: fd.cpf ? unformatCPF(fd.cpf) : undefined, contactType: fd.contactType || undefined,
    classification: fd.classification || undefined, temperature: fd.temperature || undefined,
    addressCep: fd.addressCep?.replace(/\D/g, '') || undefined, addressCity: fd.addressCity || undefined, addressState: fd.addressState || undefined,
  };
}

export const useContactCRUD = ({ toast }: { toast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void }) => {
  const createMut = useCreateContact();
  const updateMut = useUpdateContact();
  const deleteMut = useDeleteContact();
  const reassignMut = useReassignContactWithDeals();
  const checkDealsMut = useContactHasDeals();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const bufferedPrefsRef = useRef<ContactPreference[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteWithDeals, setDeleteWithDeals] = useState<{ id: string; dealCount: number; deals: Array<{ id: string; title: string }> } | null>(null);
  const [formData, setFormData] = useState<ContactFormData>(emptyFormData);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  const openCreateModal = useCallback(() => {
    setEditingContact(null); setFormData(emptyFormData); bufferedPrefsRef.current = []; setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name, email: contact.email, phone: contact.phone, ownerId: contact.ownerId, cascadeDeals: false,
      birthDate: contact.birthDate || '', source: contact.source || '', notes: contact.notes || '',
      cpf: contact.cpf ? formatCPF(contact.cpf) : '', contactType: contact.contactType || 'PF',
      classification: contact.classification || '', temperature: contact.temperature || 'WARM',
      addressCep: contact.addressCep ? formatCEP(contact.addressCep) : '', addressCity: contact.addressCity || '', addressState: contact.addressState || '', phones: [],
    });
    setIsModalOpen(true);
    contactPhonesService.getByContactId(contact.id).then(({ data }) => {
      if (data && data.length > 0) {
        setFormData(prev => ({ ...prev, phones: data.map(p => ({ id: p.id, phoneNumber: p.phoneNumber, phoneType: p.phoneType as PhoneFormEntry['phoneType'], isWhatsapp: p.isWhatsapp, isPrimary: p.isPrimary })) }));
      }
    });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteId) return;
    try {
      const r = await checkDealsMut.mutateAsync(deleteId);
      if (r.hasDeals) { setDeleteWithDeals({ id: deleteId, dealCount: r.dealCount, deals: r.deals }); setDeleteId(null); return; }
      deleteMut.mutate({ id: deleteId }, {
        onSuccess: () => { toast('Contato excluido com sucesso', 'success'); setDeleteId(null); },
        onError: (e: Error) => { toast(`Erro ao excluir: ${e.message}`, 'error'); },
      });
    } catch { toast('Erro ao verificar negocios do contato', 'error'); }
  }, [deleteId, checkDealsMut, deleteMut, toast]);

  const confirmDeleteWithDeals = useCallback(() => {
    if (!deleteWithDeals) return;
    deleteMut.mutate({ id: deleteWithDeals.id, forceDeleteDeals: true }, {
      onSuccess: () => { toast(`Contato e ${deleteWithDeals.dealCount} negocio(s) excluidos`, 'success'); setDeleteWithDeals(null); },
      onError: (e: Error) => { toast(`Erro ao excluir: ${e.message}`, 'error'); },
    });
  }, [deleteWithDeals, deleteMut, toast]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingContact(true);
    const phone = normalizePhoneE164(formData.phone);
    const phones = [...formData.phones];

    if (editingContact) {
      const ownerChanged = formData.ownerId && formData.ownerId !== editingContact.ownerId;
      if (ownerChanged && formData.cascadeDeals && formData.ownerId) {
        reassignMut.mutate(
          { contactId: editingContact.id, newOwnerId: formData.ownerId, cascadeDeals: true, name: formData.name, email: formData.email, phone },
          {
            onSuccess: async (result) => {
              try { await updateMut.mutateAsync({ id: editingContact.id, updates: buildExtraFields(formData) }); }
              catch { toast('Campos extras nao salvos, edite o contato novamente', 'warning'); }
              await syncPhones(editingContact.id, phones).catch(() => {});
              toast(result?.deals_updated ? `Contato e ${result.deals_updated} deals reatribuidos!` : 'Contato reatribuido!', 'success');
              setIsModalOpen(false);
            },
            onError: (e: Error) => { toast(`Erro ao reatribuir: ${e.message}`, 'error'); },
            onSettled: () => setIsSubmittingContact(false),
          }
        );
      } else {
        updateMut.mutate(
          { id: editingContact.id, updates: { name: formData.name, email: formData.email, phone, ownerId: formData.ownerId, ...buildExtraFields(formData) } },
          {
            onSuccess: async () => { await syncPhones(editingContact.id, phones).catch(() => {}); toast('Contato atualizado!', 'success'); setIsModalOpen(false); },
            onSettled: () => setIsSubmittingContact(false),
          }
        );
      }
    } else {
      createMut.mutate(
        { name: formData.name, email: formData.email, phone, status: 'ACTIVE', stage: ContactStage.LEAD, totalValue: 0, ...buildExtraFields(formData), contactType: formData.contactType || 'PF', temperature: formData.temperature || 'WARM' },
        {
          onSuccess: async (data) => {
            if (phones.length > 0) await syncPhones(data.id, phones).catch(() => {});
            const prefs = bufferedPrefsRef.current; let failed = 0;
            if (prefs.length > 0) {
              bufferedPrefsRef.current = [];
              for (const p of prefs) {
                try {
                  const r = await contactPreferencesService.create({ contactId: data.id, organizationId: data.organizationId || '', propertyTypes: p.propertyTypes, purpose: p.purpose, priceMin: p.priceMin, priceMax: p.priceMax, regions: p.regions, bedroomsMin: p.bedroomsMin, parkingMin: p.parkingMin, areaMin: p.areaMin, acceptsFinancing: p.acceptsFinancing, acceptsFgts: p.acceptsFgts, urgency: p.urgency, notes: p.notes } as Omit<ContactPreference, 'id' | 'createdAt' | 'updatedAt'>);
                  if (r.error) failed++;
                } catch { failed++; }
              }
            }
            toast(failed > 0 ? `Contato criado, mas ${failed} preferencia(s) nao foram salvas.` : 'Contato criado!', failed > 0 ? 'warning' : 'success');
            setIsModalOpen(false);
          },
          onError: (e: Error) => { toast(`Erro ao criar contato: ${e.message}`, 'error'); },
          onSettled: () => setIsSubmittingContact(false),
        }
      );
    }
  }, [formData, editingContact, reassignMut, updateMut, createMut, toast]);

  return {
    isModalOpen, setIsModalOpen, editingContact, formData, setFormData, isSubmittingContact,
    deleteId, setDeleteId, deleteWithDeals, setDeleteWithDeals, bufferedPrefsRef,
    openCreateModal, openEditModal, confirmDelete, confirmDeleteWithDeals, handleSubmit,
  };
};

export { type ContactFormData } from '@/features/contacts/components/ContactFormModal';
