import React from 'react';
import { Tag, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsSection } from './SettingsSection';
import { EmptyState } from '@/components/ui/EmptyState';

interface TagsManagerProps {
  availableTags: string[];
  newTagName: string;
  setNewTagName: (name: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
}

export const TagsManager: React.FC<TagsManagerProps> = ({
  availableTags,
  newTagName,
  setNewTagName,
  onAddTag,
  onRemoveTag,
}) => {
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
          className="flex-1 max-w-xs px-3 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 text-sm rounded-full"
            >
              {tag}
              <Button
                type="button"
                onClick={() => onRemoveTag(tag)}
                className="text-slate-400 hover:text-red-500 transition-colors"
                aria-label={`Remover tag ${tag}`}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </span>
          ))}
        </div>
      )}
    </SettingsSection>
  );
};
