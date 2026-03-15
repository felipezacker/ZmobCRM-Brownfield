import React, { useState, useCallback, useMemo } from 'react';
import { Tag, Pencil, Plus, X, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsSection } from './SettingsSection';
import { EmptyState } from '@/components/ui/EmptyState';
import ConfirmModal from '@/components/ConfirmModal';
import { useSettings } from '@/context/settings/SettingsContext';

export const TAG_COLOR_PALETTE = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
  '#22c55e', // green-500
  '#14b8a6', // teal-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#64748b', // slate-500
  '#a3e635', // lime-400
  '#38bdf8', // sky-400
  '#fb7185', // rose-400
] as const;

const TAG_DEFAULT_COLOR = '#6b7280';

/** Returns '#fff' or '#1e293b' based on perceived luminance of hex color. */
export function getTagTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.55 ? '#1e293b' : '#fff';
}

/** Resolve a valid hex color or fallback to default. */
function resolveColor(color: string | null): string {
  return (color && color.startsWith('#')) ? color : TAG_DEFAULT_COLOR;
}

/** Extract category prefix from tag name, e.g. "[LIG] - Foo" → "LIG" */
function extractCategory(name: string): string | null {
  const match = name.match(/^\[([A-Z]+)\]/);
  return match ? match[1] : null;
}

const COLOR_LABELS: Record<string, string> = {
  '#ef4444': 'vermelha',
  '#f97316': 'laranja',
  '#eab308': 'amarela',
  '#22c55e': 'verde',
  '#14b8a6': 'teal',
  '#3b82f6': 'azul',
  '#8b5cf6': 'violeta',
  '#ec4899': 'rosa',
  '#64748b': 'cinza',
  '#a3e635': 'lima',
  '#38bdf8': 'celeste',
  '#fb7185': 'rosa claro',
};

function ColorPicker({
  selectedColor,
  onSelect,
  size = 'md',
}: {
  selectedColor: string | null;
  onSelect: (color: string | null) => void;
  size?: 'sm' | 'md';
}) {
  const dotSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className="flex flex-wrap gap-1.5">
      {TAG_COLOR_PALETTE.map((color) => (
        // eslint-disable-next-line no-restricted-syntax -- color palette dot, not a standard action button
        <button
          key={color}
          type="button"
          onClick={() => onSelect(selectedColor === color ? null : color)}
          className={`${dotSize} rounded-full border-2 transition-all ${
            selectedColor === color
              ? 'border-foreground scale-110 ring-1 ring-white/20'
              : 'border-transparent hover:scale-110'
          }`}
          style={{ backgroundColor: color }}
          aria-label={`Selecionar cor ${COLOR_LABELS[color] || color}`}
        />
      ))}
    </div>
  );
}

export const TagsManager: React.FC = () => {
  const { availableTags, addTag, removeTag, renameTag, updateTagColor, updateTagDescription } = useSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState<string | null>(null);
  const [newTagDescription, setNewTagDescription] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [pendingRemoveTag, setPendingRemoveTag] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState<string | null>(null);

  const tagMap = useMemo(
    () => new Map(availableTags.map(t => [t.name, t])),
    [availableTags],
  );

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return availableTags;
    const q = searchQuery.toLowerCase();
    return availableTags.filter(t => t.name.toLowerCase().includes(q));
  }, [availableTags, searchQuery]);

  const handleAddTag = useCallback(async () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    await addTag(trimmed, newTagColor, newTagDescription || null);
    setNewTagName('');
    setNewTagColor(null);
    setNewTagDescription('');
    setShowAddForm(false);
  }, [newTagName, newTagColor, newTagDescription, addTag]);

  const startEdit = (tag: { name: string; color: string | null; description: string | null }) => {
    setEditingTag(tag.name);
    setEditValue(tag.name);
    setEditColor(tag.color);
    setEditDescription(tag.description || '');
  };

  const cancelEdit = () => {
    setEditingTag(null);
    setEditValue('');
    setEditColor(null);
    setEditDescription('');
  };

  const saveEdit = async () => {
    if (!editingTag) return;
    const trimmed = editValue.trim();
    const originalTag = tagMap.get(editingTag);
    const finalName = (trimmed && trimmed !== editingTag) ? trimmed : editingTag;
    if (trimmed && trimmed !== editingTag) {
      await renameTag(editingTag, trimmed);
    }
    if (originalTag && editColor !== originalTag.color) {
      await updateTagColor(finalName, editColor);
    }
    const trimmedDesc = editDescription.trim() || null;
    if (originalTag && trimmedDesc !== (originalTag.description || null)) {
      await updateTagDescription(finalName, trimmedDesc);
    }
    cancelEdit();
  };

  return (
    <SettingsSection
      title="Tags"
      icon={Tag}
    >
      {/* Top bar: search + add */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar tag..."
            className="w-full pl-9 pr-3 py-2 bg-background dark:bg-black/20 border border-border rounded-xl text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <Button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova Tag
        </Button>
      </div>

      {/* Add form (collapsible) */}
      {showAddForm && (
        <div className="mb-4 p-3 bg-muted/50 dark:bg-white/5 rounded-xl border border-border space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="Nome da tag..."
              autoFocus
              className="flex-1 px-3 py-1.5 bg-background dark:bg-black/20 border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <Button
              type="button"
              onClick={handleAddTag}
              disabled={!newTagName.trim()}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Criar
            </Button>
            <Button
              type="button"
              onClick={() => { setShowAddForm(false); setNewTagName(''); setNewTagColor(null); setNewTagDescription(''); }}
              className="px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <input
            type="text"
            value={newTagDescription}
            onChange={(e) => setNewTagDescription(e.target.value)}
            placeholder="Descricao (opcional)..."
            className="w-full px-3 py-1.5 bg-background dark:bg-black/20 border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <ColorPicker selectedColor={newTagColor} onSelect={setNewTagColor} size="sm" />
        </div>
      )}

      {/* Tags table */}
      {availableTags.length === 0 ? (
        <EmptyState title="Nenhuma tag criada ainda." size="sm" />
      ) : filteredTags.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma tag encontrada para &quot;{searchQuery}&quot;</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 dark:bg-white/5">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-3 py-2 w-10">Cor</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-3 py-2">Nome</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-3 py-2 hidden md:table-cell">Descricao</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-3 py-2 w-24 hidden sm:table-cell">Preview</th>
                <th className="w-16 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTags.map((tag) => {
                const bgColor = resolveColor(tag.color);
                const category = extractCategory(tag.name);
                const isEditing = editingTag === tag.name;

                return (
                  <React.Fragment key={tag.name}>
                  <tr
                    className="group border-t border-border/50 hover:bg-muted/30 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    {/* Color dot */}
                    <td className="px-3 py-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full ring-1 ring-black/10 dark:ring-white/20"
                        style={{ backgroundColor: isEditing ? resolveColor(editColor) : bgColor }}
                      />
                    </td>

                    {/* Name */}
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          autoFocus
                          className="w-full max-w-xs px-2 py-0.5 bg-background dark:bg-black/20 border border-primary-500 rounded-lg text-sm text-foreground outline-none"
                        />
                      ) : (
                        <span className="text-foreground">{tag.name}</span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="px-3 py-2 hidden md:table-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          placeholder="Descricao opcional..."
                          className="w-full max-w-xs px-2 py-0.5 bg-background dark:bg-black/20 border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary-500"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground truncate block max-w-[200px]">
                          {tag.description || '—'}
                        </span>
                      )}
                    </td>

                    {/* Preview chip */}
                    <td className="px-3 py-2 hidden sm:table-cell">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${bgColor}1A`,
                          color: bgColor === TAG_DEFAULT_COLOR ? 'var(--muted-foreground)' : bgColor,
                        }}
                      >
                        {category || 'tag'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            onClick={saveEdit}
                            className="p-1 text-primary-600 hover:text-primary-500 transition-colors"
                            aria-label="Salvar"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            onClick={cancelEdit}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Cancelar"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            type="button"
                            onClick={() => startEdit(tag)}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={`Editar tag ${tag.name}`}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            onClick={() => setPendingRemoveTag(tag.name)}
                            className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                            aria-label={`Remover tag ${tag.name}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* Edit color picker row */}
                  {isEditing && (
                    <tr className="border-t border-dashed border-border/30 bg-muted/20 dark:bg-white/[0.02]">
                      <td colSpan={5} className="px-3 py-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground shrink-0">Cor:</span>
                          <ColorPicker selectedColor={editColor} onSelect={setEditColor} size="sm" />
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* Footer with count */}
          <div className="px-3 py-2 bg-muted/30 dark:bg-white/[0.02] border-t border-border/50 text-xs text-muted-foreground">
            {filteredTags.length} de {availableTags.length} tag{availableTags.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!pendingRemoveTag}
        onClose={() => setPendingRemoveTag(null)}
        onConfirm={() => {
          if (pendingRemoveTag) removeTag(pendingRemoveTag);
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
