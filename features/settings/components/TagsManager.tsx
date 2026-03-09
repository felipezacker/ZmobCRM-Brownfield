import React, { useState } from 'react';
import { Tag, Pencil, Plus, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsSection } from './SettingsSection';
import { EmptyState } from '@/components/ui/EmptyState';
import ConfirmModal from '@/components/ConfirmModal';

interface TagsManagerProps {
  availableTags: string[];
  newTagName: string;
  setNewTagName: (name: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onRenameTag: (oldName: string, newName: string) => void;
}

export const TagsManager: React.FC<TagsManagerProps> = ({
  availableTags,
  newTagName,
  setNewTagName,
  onAddTag,
  onRemoveTag,
  onRenameTag,
}) => {
  const [pendingRemoveTag, setPendingRemoveTag] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (tag: string) => {
    setEditingTag(tag);
    setEditValue(tag);
  };

  const cancelEdit = () => {
    setEditingTag(null);
    setEditValue('');
  };

  const saveEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && editingTag && trimmed !== editingTag) {
      onRenameTag(editingTag, trimmed);
    }
    cancelEdit();
  };

  return (
    <SettingsSection
      title="Tags"
      icon={Tag}
    >
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAddTag()}
          placeholder="Nova tag..."
          className="flex-1 max-w-xs px-3 py-2 bg-background dark:bg-black/20 border border-border rounded-xl text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <Button
          type="button"
          onClick={onAddTag}
          disabled={!newTagName.trim()}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {availableTags.length === 0 ? (
        <EmptyState title="Nenhuma tag criada ainda." size="sm" />
      ) : (
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted dark:bg-white/10 text-secondary-foreground dark:text-muted-foreground text-sm rounded-full"
            >
              {editingTag === tag ? (
                <>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    onBlur={saveEdit}
                    autoFocus
                    className="w-24 px-1 py-0 bg-transparent border-b border-primary-500 text-sm text-foreground outline-none"
                  />
                  <Button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={saveEdit}
                    className="text-primary-600 hover:text-primary-500 transition-colors"
                    aria-label="Salvar edição"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  {tag}
                  <Button
                    type="button"
                    onClick={() => startEdit(tag)}
                    className="text-muted-foreground hover:text-primary-600 transition-colors"
                    aria-label={`Editar tag ${tag}`}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setPendingRemoveTag(tag)}
                    className="text-muted-foreground hover:text-red-500 transition-colors"
                    aria-label={`Remover tag ${tag}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </span>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!pendingRemoveTag}
        onClose={() => setPendingRemoveTag(null)}
        onConfirm={() => {
          if (pendingRemoveTag) onRemoveTag(pendingRemoveTag);
          setPendingRemoveTag(null);
        }}
        title="Remover tag"
        message={`Remover a tag "${pendingRemoveTag || ''}"? Contatos que usam esta tag serão atualizados.`}
        confirmText="Remover"
        variant="danger"
      />
    </SettingsSection>
  );
};
