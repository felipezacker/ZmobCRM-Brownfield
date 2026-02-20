import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Contact } from '@/types';
import { Modal, ModalForm } from '@/components/ui/Modal';
import { InputField, SubmitButton } from '@/components/ui/FormField';
import { contactFormSchema } from '@/lib/validations/schemas';
import type { ContactFormData } from '@/lib/validations/schemas';
import { CorretorSelect } from '@/components/ui/CorretorSelect';
import { useAuth } from '@/context/AuthContext';

type ContactFormInput = z.input<typeof contactFormSchema>;

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ContactFormData) => void;
  editingContact: Contact | null;
}

export const ContactFormModalV2: React.FC<ContactFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingContact,
}) => {
  const { profile } = useAuth();
  const [selectedOwnerId, setSelectedOwnerId] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedOwnerId(editingContact?.ownerId || profile?.id);
    }
  }, [isOpen, editingContact, profile?.id]);

  const form = useForm<ContactFormInput>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: editingContact?.name || '',
      email: editingContact?.email || '',
      phone: editingContact?.phone || '',
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = form;

  // Reset form when modal opens with different contact
  React.useEffect(() => {
    if (isOpen) {
      reset({
        name: editingContact?.name || '',
        email: editingContact?.email || '',
        phone: editingContact?.phone || '',
      });
    }
  }, [isOpen, editingContact, reset]);

  const handleFormSubmit = (data: ContactFormInput) => {
    const parsed = contactFormSchema.parse(data);
    onSubmit({ ...parsed, ownerId: selectedOwnerId } as ContactFormData & { ownerId?: string });
    onClose();
    reset();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingContact ? 'Editar Contato' : 'Novo Contato'}
    >
      <ModalForm onSubmit={handleSubmit(handleFormSubmit)}>
        <InputField
          label="Nome Completo"
          placeholder="Ex: Ana Souza"
          error={errors.name}
          registration={register('name')}
        />

        <InputField
          label="Email"
          type="email"
          placeholder="ana@empresa.com"
          error={errors.email}
          registration={register('email')}
        />

        <InputField
          label="Telefone"
          placeholder="+5511999999999"
          hint="Formato E.164 (ex.: +5511999999999)"
          error={errors.phone}
          registration={register('phone')}
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Corretor Responsável
          </label>
          <CorretorSelect
            value={selectedOwnerId}
            onChange={setSelectedOwnerId}
          />
        </div>

        <SubmitButton isLoading={isSubmitting}>
          {editingContact ? 'Salvar Alterações' : 'Criar Contato'}
        </SubmitButton>
      </ModalForm>
    </Modal>
  );
};
