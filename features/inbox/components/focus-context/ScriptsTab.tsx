import React, { useState } from 'react';
import { Plus, Sparkles, CheckCircle2, FileText, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateSalesScript } from '@/lib/ai/tasksClient';
import type { ScriptCategory, QuickScript } from '@/lib/supabase/quickScripts';

interface ScriptsTabProps {
    scripts: QuickScript[];
    isLoading: boolean;
    contactName?: string;
    dealTitle: string;
    currentStageLabel?: string;
    applyVariables: (template: string, vars: Record<string, string>) => string;
    getCategoryInfo: (category: ScriptCategory) => { label: string; color: string };
    onOpenEditor: (script?: { id: string; title: string; category: string; template: string; icon: string } | null) => void;
    onDelete: (id: string) => void;
    onNoteChange: (value: string) => void;
}

export const ScriptsTab: React.FC<ScriptsTabProps> = ({
    scripts,
    isLoading,
    contactName,
    dealTitle,
    currentStageLabel,
    applyVariables,
    getCategoryInfo,
    onOpenEditor,
    onDelete,
    onNoteChange,
}) => {
    const [copiedScript, setCopiedScript] = useState<string | null>(null);
    const firstName = contactName?.split(' ')[0] || 'Cliente';

    const copyScript = (template: string, scriptId: string) => {
        const text = applyVariables(template, { nome: firstName });
        navigator.clipboard.writeText(text);
        setCopiedScript(scriptId);
        setTimeout(() => setCopiedScript(null), 2000);
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-800">
            <div className="flex items-center justify-between mb-4 px-1">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                    Templates de Venda
                    {isLoading && <Loader2 size={12} className="animate-spin" />}
                </p>
                <Button
                    onClick={() => onOpenEditor(null)}
                    className="flex items-center gap-1 text-[10px] px-2 py-1 bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 rounded-md transition-colors"
                >
                    <Plus size={12} />
                    Criar
                </Button>
            </div>

            {/* AI Script Generator */}
            <div className="mb-4 p-3 bg-gradient-to-br from-primary-500/10 to-purple-500/10 rounded-lg border border-primary-500/20">
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-primary-400" />
                    <span className="text-xs font-medium text-white">Gerar Script com IA</span>
                </div>
                <div className="flex gap-2">
                    {(['followup', 'closing', 'objection', 'rescue'] as ScriptCategory[]).map((type) => (
                        <Button
                            key={type}
                            onClick={async () => {
                                try {
                                    const result = await generateSalesScript({
                                        deal: { title: dealTitle },
                                        scriptType: type,
                                        context: `Estagio: ${currentStageLabel || 'N/A'}. Contato: ${contactName || 'Cliente'}.`,
                                    });
                                    if (result?.script) {
                                        onNoteChange(result.script);
                                        navigator.clipboard.writeText(result.script);
                                    }
                                } catch (err) {
                                    console.error('AI Script error:', err);
                                }
                            }}
                            className="flex-1 text-[9px] px-2 py-1.5 bg-card/60 hover:bg-accent text-muted-foreground hover:text-white rounded transition-colors capitalize"
                        >
                            {type === 'followup' ? 'Follow-up' : type === 'closing' ? 'Fechamento' : type === 'objection' ? 'Objecao' : 'Resgate'}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                {scripts.map((script) => {
                    const categoryInfo = getCategoryInfo(script.category);
                    return (
                        <div
                            key={script.id}
                            className={`p-4 bg-card/40 rounded-xl border border-white/5 hover:border-border hover:bg-card/80 transition-all cursor-pointer group ${copiedScript === script.id ? 'ring-2 ring-emerald-500/50' : ''}`}
                            onClick={() => {
                                copyScript(script.template, script.id);
                                onNoteChange(applyVariables(script.template, { nome: firstName }));
                            }}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`px-2 py-0.5 rounded text-[10px] font-medium bg-${categoryInfo.color}-500/20 text-${categoryInfo.color}-400`}>
                                        {categoryInfo.label}
                                    </div>
                                    <span className="text-sm font-semibold text-white">{script.title}</span>
                                    {script.is_system && (
                                        <span className="text-[9px] text-muted-foreground bg-accent/50 px-1.5 py-0.5 rounded">Sistema</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    {copiedScript === script.id && (
                                        <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                                            <CheckCircle2 size={10} /> Copiado!
                                        </span>
                                    )}
                                    {!script.is_system && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenEditor({
                                                        id: script.id,
                                                        title: script.title,
                                                        category: script.category,
                                                        template: script.template,
                                                        icon: script.icon,
                                                    });
                                                }}
                                                className="p-1 text-muted-foreground hover:text-primary-400 hover:bg-primary-500/10 rounded transition-colors"
                                                title="Editar"
                                            >
                                                <FileText size={12} />
                                            </Button>
                                            <Button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm('Excluir este script?')) {
                                                        onDelete(script.id);
                                                    }
                                                }}
                                                className="p-1 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 size={12} />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 group-hover:text-muted-foreground">
                                {applyVariables(script.template, { nome: firstName })}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
