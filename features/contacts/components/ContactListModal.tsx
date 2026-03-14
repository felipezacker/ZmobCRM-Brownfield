import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import ConfirmModal from '@/components/ConfirmModal';
import type { ContactList } from '@/types';

const COLOR_PALETTE = [
  '#6B7280', '#EF4444', '#F59E0B', '#10B981',
  '#3B82F6', '#8B5CF6', '#EC4899', '#F97316',
];

interface ContactListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; color: string; description?: string }) => void;
  onDelete?: (id: string) => void;
  editingList?: ContactList | null;
  isSaving?: boolean;
}

export const ContactListModal: React.FC<ContactListModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingList,
  isSaving,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [description, setDescription] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditing = !!editingList;

  useEffect(() => {
    if (isOpen) {
      if (editingList) {
        setName(editingList.name);
        setColor(editingList.color || COLOR_PALETTE[0]);
        setDescription(editingList.description || '');
      } else {
        setName('');
        setColor(COLOR_PALETTE[0]);
        setDescription('');
      }
      setShowDeleteConfirm(false);
    }
  }, [isOpen, editingList]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), color, description: description.trim() || undefined });
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditing ? 'Editar Lista' : 'Nova Lista'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="list-name" className="block text-sm font-medium text-foreground mb-1">
              Nome *
            </label>
            <input
              id="list-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Lista XP, Lista Medicos..."
              className="w-full rounded-lg border border-border bg-white dark:bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
              required
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Cor
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_PALETTE.map(c => (
                <Button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    color === c
                      ? 'border-foreground scale-110'
                      : 'border-transparent hover:border-muted-foreground'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Description (optional) */}
          <div>
            <label htmlFor="list-desc" className="block text-sm font-medium text-foreground mb-1">
              Descricao (opcional)
            </label>
            <input
              id="list-desc"
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descricao da lista..."
              className="w-full rounded-lg border border-border bg-white dark:bg-white/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            {isEditing && onDelete ? (
              <Button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
                Excluir
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/5 rounded-lg transition-colors"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || isSaving}
                className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 disabled:bg-accent disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {isSaving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          if (editingList && onDelete) {
            onDelete(editingList.id);
            setShowDeleteConfirm(false);
          }
        }}
        title="Excluir Lista"
        message={`Remover a lista "${editingList?.name}"? Os contatos NAO serao excluidos, apenas a associacao com esta lista.`}
        confirmText="Excluir Lista"
        variant="danger"
      />
    </>
  );
};
