import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PenTool, Pencil, Check, Plus, X, Search, Type, Hash, DollarSign, Calendar, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import ConfirmModal from '@/components/ConfirmModal';
import { SettingsSection } from './SettingsSection';
import { CustomFieldDefinition, CustomFieldType } from '@/types';
import { useSettings } from '@/context/settings/SettingsContext';

const FIELD_TYPE_CONFIG: Record<CustomFieldType, { label: string; icon: React.ElementType; color: string }> = {
  text:     { label: 'Texto',   icon: Type,       color: '#64748b' },
  number:   { label: 'Numero',  icon: Hash,       color: '#3b82f6' },
  currency: { label: 'Moeda',   icon: DollarSign, color: '#22c55e' },
  date:     { label: 'Data',    icon: Calendar,   color: '#f97316' },
  select:   { label: 'Opcoes',  icon: List,       color: '#8b5cf6' },
};

function FieldTypeSelector({
  value,
  onChange,
}: {
  value: CustomFieldType;
  onChange: (type: CustomFieldType) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = FIELD_TYPE_CONFIG[value];
  const CurrentIcon = current.icon;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {/* eslint-disable-next-line no-restricted-syntax -- custom dropdown trigger, not a standard action button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-background dark:bg-black/20 border border-border rounded-lg text-sm text-foreground hover:border-primary-500 transition-colors min-w-[130px]"
      >
        <CurrentIcon className="h-3.5 w-3.5" style={{ color: current.color }} />
        {current.label}
        <span className="ml-auto text-muted-foreground text-xs">▼</span>
      </button>

      {open && (
        <div className="absolute z-10 top-full mt-1 left-0 w-full bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg overflow-hidden">
          {(Object.entries(FIELD_TYPE_CONFIG) as [CustomFieldType, typeof current][]).map(([type, config]) => {
            const Icon = config.icon;
            return (
              // eslint-disable-next-line no-restricted-syntax -- dropdown menu item, not a standard action button
              <button
                key={type}
                type="button"
                onClick={() => { onChange(type); setOpen(false); }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors ${
                  value === type
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'text-foreground hover:bg-muted dark:hover:bg-white/5'
                }`}
              >
                {value === type && <Check className="h-3 w-3 text-primary-600" />}
                {value !== type && <span className="w-3" />}
                <Icon className="h-3.5 w-3.5" style={{ color: config.color }} />
                {config.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const CustomFieldsManager: React.FC = () => {
  const { customFieldDefinitions, addCustomField, updateCustomField, removeCustomField } = useSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editType, setEditType] = useState<CustomFieldType>('text');
  const [editOptions, setEditOptions] = useState('');
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  const pendingField = customFieldDefinitions.find(f => f.id === pendingRemoveId);

  const filteredFields = searchQuery.trim()
    ? customFieldDefinitions.filter(f =>
        f.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.key.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : customFieldDefinitions;

  const handleAddField = useCallback(async () => {
    const label = newFieldLabel.trim();
    if (!label) return;
    const options = newFieldType === 'select'
      ? newFieldOptions.split(',').map(o => o.trim()).filter(Boolean)
      : undefined;
    const key = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    await addCustomField({ key, label, type: newFieldType, options });
    setNewFieldLabel('');
    setNewFieldType('text');
    setNewFieldOptions('');
    setShowAddForm(false);
  }, [newFieldLabel, newFieldType, newFieldOptions, addCustomField]);

  const startEdit = (field: CustomFieldDefinition) => {
    setEditingId(field.id);
    setEditLabel(field.label);
    setEditType(field.type);
    setEditOptions(field.options?.join(', ') ?? '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel('');
    setEditType('text');
    setEditOptions('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const label = editLabel.trim();
    if (!label) return;
    const options = editType === 'select'
      ? editOptions.split(',').map(o => o.trim()).filter(Boolean)
      : undefined;
    await updateCustomField(editingId, { label, type: editType, options });
    cancelEdit();
  };

  return (
    <SettingsSection title="Campos Personalizados" icon={PenTool}>
      {/* Top bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar campo..."
            className="w-full pl-9 pr-3 py-2 bg-background dark:bg-black/20 border border-border rounded-xl text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <Button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Campo
        </Button>
      </div>

      {/* Add form (collapsible) */}
      {showAddForm && (
        <div className="mb-4 p-3 bg-muted/50 dark:bg-white/5 rounded-xl border border-border space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newFieldLabel}
              onChange={(e) => setNewFieldLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddField()}
              placeholder="Nome do campo..."
              autoFocus
              className="flex-1 px-3 py-1.5 bg-background dark:bg-black/20 border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <FieldTypeSelector value={newFieldType} onChange={setNewFieldType} />
            <Button
              type="button"
              onClick={handleAddField}
              disabled={!newFieldLabel.trim()}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Criar
            </Button>
            <Button
              type="button"
              onClick={() => { setShowAddForm(false); setNewFieldLabel(''); setNewFieldType('text'); setNewFieldOptions(''); }}
              className="px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {newFieldType === 'select' && (
            <input
              type="text"
              value={newFieldOptions}
              onChange={(e) => setNewFieldOptions(e.target.value)}
              placeholder="Opcoes separadas por virgula (ex: Google, Facebook, Instagram)"
              className="w-full px-3 py-1.5 bg-background dark:bg-black/20 border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          )}
        </div>
      )}

      {/* Fields table */}
      {customFieldDefinitions.length === 0 ? (
        <EmptyState title="Nenhum campo personalizado criado." size="sm" />
      ) : filteredFields.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Nenhum campo encontrado para &quot;{searchQuery}&quot;</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 dark:bg-white/5">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-3 py-2 w-10">Tipo</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-3 py-2">Nome</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-3 py-2 hidden sm:table-cell">Chave</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide px-3 py-2 hidden md:table-cell">Detalhes</th>
                <th className="w-16 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredFields.map((field) => {
                const typeConfig = FIELD_TYPE_CONFIG[field.type] || FIELD_TYPE_CONFIG.text;
                const TypeIcon = typeConfig.icon;
                const isEditing = editingId === field.id;

                return (
                  <React.Fragment key={field.id}>
                  <tr className="group border-t border-border/50 hover:bg-muted/30 dark:hover:bg-white/[0.03] transition-colors">
                    {/* Type icon */}
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <FieldTypeSelector value={editType} onChange={setEditType} />
                      ) : (
                        <TypeIcon className="h-4 w-4" style={{ color: typeConfig.color }} />
                      )}
                    </td>

                    {/* Label */}
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          autoFocus
                          className="w-full max-w-xs px-2 py-0.5 bg-background dark:bg-black/20 border border-primary-500 rounded-lg text-sm text-foreground outline-none"
                        />
                      ) : (
                        <span className="text-foreground font-medium">{field.label}</span>
                      )}
                    </td>

                    {/* Key */}
                    <td className="px-3 py-2 hidden sm:table-cell">
                      <code className="text-xs text-muted-foreground font-mono">{field.key}</code>
                    </td>

                    {/* Details */}
                    <td className="px-3 py-2 hidden md:table-cell">
                      {isEditing && editType === 'select' ? (
                        <input
                          type="text"
                          value={editOptions}
                          onChange={(e) => setEditOptions(e.target.value)}
                          placeholder="Opcoes separadas por virgula..."
                          className="w-full max-w-xs px-2 py-0.5 bg-background dark:bg-black/20 border border-border rounded-lg text-sm text-foreground outline-none focus:border-primary-500"
                        />
                      ) : field.options && field.options.length > 0 ? (
                        <span className="text-xs text-muted-foreground">{field.options.length} opcoes</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">{typeConfig.label}</span>
                      )}
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
                            onClick={() => startEdit(field)}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={`Editar campo ${field.label}`}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            onClick={() => setPendingRemoveId(field.id)}
                            className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                            aria-label={`Remover campo ${field.label}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* Footer */}
          <div className="px-3 py-2 bg-muted/30 dark:bg-white/[0.02] border-t border-border/50 text-xs text-muted-foreground">
            {filteredFields.length} de {customFieldDefinitions.length} campo{customFieldDefinitions.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!pendingRemoveId}
        onClose={() => setPendingRemoveId(null)}
        onConfirm={() => {
          if (pendingRemoveId) removeCustomField(pendingRemoveId);
          setPendingRemoveId(null);
        }}
        title="Remover campo personalizado"
        message={`Remover o campo "${pendingField?.label || ''}"? Dados existentes neste campo serão perdidos.`}
        confirmText="Remover"
        variant="danger"
      />
    </SettingsSection>
  );
};
