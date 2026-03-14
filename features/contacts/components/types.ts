import type { Contact, ContactPreference, PhoneType } from '@/types';

// ============================================
// Tipos de dados do formulario de telefone
// ============================================
export interface PhoneFormEntry {
  /** ID temporario (UUID ou temp-*). */
  id: string;
  phoneNumber: string;
  phoneType: PhoneType;
  isWhatsapp: boolean;
  isPrimary: boolean;
}

export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  ownerId: string | undefined;
  cascadeDeals: boolean;
  birthDate: string;
  source: '' | 'WEBSITE' | 'LINKEDIN' | 'REFERRAL' | 'MANUAL';
  notes: string;
  // Story 3.1 — Novos campos
  cpf: string;
  contactType: import('@/types').ContactType;
  classification: import('@/types').ContactClassification | '';
  temperature: import('@/types').ContactTemperature;
  addressCep: string;
  addressCity: string;
  addressState: string;
  phones: PhoneFormEntry[];
}

export interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: ContactFormData;
  setFormData: React.Dispatch<React.SetStateAction<ContactFormData>>;
  editingContact: Contact | null;
  createFakeContactsBatch?: (count: number) => Promise<void>;
  isSubmitting?: boolean;
  /** Ref compartilhado para preferencia buffered durante criacao */
  bufferedPrefRef?: React.MutableRefObject<ContactPreference | null>;
  /** Callback to open contact detail modal instead of navigating */
  onOpenDetail?: (contactId: string) => void;
}
