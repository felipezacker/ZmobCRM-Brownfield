/**
 * Script Editor Modal
 * CRUD interface for user custom scripts
 */
import React, { useState, useEffect } from 'react';
import { X, Save, Sparkles, Eye, MessageSquare, AlertCircle, Target, RefreshCw } from 'lucide-react';
import type { ScriptCategory } from '@/lib/supabase/quickScripts';
import { Button } from '@/components/ui/button';
import { MODAL_BACKDROP_CLASS } from '@/components/ui/modalStyles';

interface ScriptEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (script: ScriptFormData) => Promise<void>;
    initialData?: ScriptFormData | null;
    previewVariables?: Record<string, string>;
}

export interface ScriptFormData {
    id?: string;
    title: string;
    category: ScriptCategory;
    template: string;
    icon: string;
}

const CATEGORIES: { value: ScriptCategory; label: string; color: string }[] = [
    { value: 'followup', label: 'Follow-up', color: 'blue' },
    { value: 'objection', label: 'Objeções', color: 'orange' },
    { value: 'closing', label: 'Fechamento', color: 'green' },
    { value: 'intro', label: 'Apresentação', color: 'purple' },
    { value: 'rescue', label: 'Resgate', color: 'yellow' },
    { value: 'other', label: 'Outros', color: 'slate' },
];

const ICONS = [
    { value: 'MessageSquare', icon: MessageSquare, label: 'Mensagem' },
    { value: 'AlertCircle', icon: AlertCircle, label: 'Alerta' },
    { value: 'Target', icon: Target, label: 'Alvo' },
    { value: 'Sparkles', icon: Sparkles, label: 'Brilho' },
    { value: 'RefreshCw', icon: RefreshCw, label: 'Refresh' },
];

/**
 * Componente React `ScriptEditorModal`.
 *
 * @param {ScriptEditorModalProps} {
    isOpen,
    onClose,
    onSave,
    initialData,
    previewVariables = { nome: 'Cliente', empresa: 'Empresa' }
} - Parâmetro `{
    isOpen,
    onClose,
    onSave,
    initialData,
    previewVariables = { nome: 'Cliente', empresa: 'Empresa' }
}`.
 * @returns {Element | null} Retorna um valor do tipo `Element | null`.
 */
export function ScriptEditorModal({
    isOpen,
    onClose,
    onSave,
    initialData,
    previewVariables = { nome: 'Cliente', empresa: 'Empresa' }
}: ScriptEditorModalProps) {
    const [formData, setFormData] = useState<ScriptFormData>({
        title: '',
        category: 'other',
        template: '',
        icon: 'MessageSquare',
    });
    const [showPreview, setShowPreview] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                title: '',
                category: 'other',
                template: '',
                icon: 'MessageSquare',
            });
        }
    }, [initialData, isOpen]);

    const handleSave = async () => {
        if (!formData.title.trim() || !formData.template.trim()) return;

        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const applyVariables = (template: string): string => {
        let result = template;
        for (const [key, value] of Object.entries(previewVariables)) {
            result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }
        return result;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 md:left-[var(--app-sidebar-width,0px)] z-[var(--z-modal)] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 ${MODAL_BACKDROP_CLASS}`}
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl mx-4 bg-card rounded-xl border border-border shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">
                        {initialData?.id ? 'Editar Script' : 'Novo Script'}
                    </h2>
                    <Button
                        onClick={onClose}
                        className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X size={20} />
                    </Button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                    {/* Title */}
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2">
                            Título do Script
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Ex: Follow-up de Proposta"
                            className="w-full px-4 py-2.5 bg-card/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-transparent"
                        />
                    </div>

                    {/* Category & Icon Row */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Category */}
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-2">
                                Categoria
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value as ScriptCategory })}
                                className="w-full px-4 py-2.5 bg-card/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-transparent appearance-none cursor-pointer"
                            >
                                {CATEGORIES.map((cat) => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Icon */}
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-2">
                                Ícone
                            </label>
                            <div className="flex gap-2">
                                {ICONS.map((iconOption) => {
                                    const IconComponent = iconOption.icon;
                                    return (
                                        <Button
                                            key={iconOption.value}
                                            onClick={() => setFormData({ ...formData, icon: iconOption.value })}
                                            className={`p-2.5 rounded-lg border transition-all ${formData.icon === iconOption.value
                                                    ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
                                                    : 'bg-card/50 border-border text-muted-foreground hover:text-foreground hover:border-border'
                                                }`}
                                            title={iconOption.label}
                                        >
                                            <IconComponent size={18} />
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Template */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                Mensagem Template
                            </label>
                            <Button
                                onClick={() => setShowPreview(!showPreview)}
                                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors ${showPreview
                                        ? 'bg-primary-500/20 text-primary-400'
                                        : 'text-muted-foreground hover:text-muted-foreground'
                                    }`}
                            >
                                <Eye size={12} />
                                Preview
                            </Button>
                        </div>

                        {!showPreview ? (
                            <textarea
                                value={formData.template}
                                onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                                placeholder="Olá {nome}! 👋&#10;&#10;Escreva sua mensagem aqui...&#10;&#10;Use {nome} e {empresa} como variáveis."
                                rows={8}
                                className="w-full px-4 py-3 bg-card/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-transparent resize-none font-mono text-sm"
                            />
                        ) : (
                            <div className="w-full px-4 py-3 bg-card/50 border border-border rounded-lg min-h-[200px] whitespace-pre-wrap text-sm text-foreground">
                                {applyVariables(formData.template) ||
                                    <span className="text-muted-foreground italic">Nenhum texto para preview...</span>
                                }
                            </div>
                        )}

                        <p className="text-[10px] text-secondary-foreground mt-2">
                            💡 Variáveis disponíveis: {'{nome}'}, {'{empresa}'}, {'{valor}'}, {'{produto}'}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-background/50">
                    <Button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!formData.title.trim() || !formData.template.trim() || isSaving}
                        className="flex items-center gap-2 px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={16} />
                        {isSaving ? 'Salvando...' : 'Salvar Script'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
