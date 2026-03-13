import React from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DealNote } from '@/lib/supabase/dealNotes';

interface NotesTabProps {
    notes: DealNote[];
    isLoading: boolean;
    isSaving: boolean;
    note: string;
    onNoteChange: (value: string) => void;
    onSubmit: () => void;
    onDelete: (id: string) => void;
}

export const NotesTab: React.FC<NotesTabProps> = ({
    notes,
    isLoading,
    isSaving,
    note,
    onNoteChange,
    onSubmit,
    onDelete,
}) => {
    return (
        <div className="flex-1 flex flex-col bg-zinc-900">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notas do Deal</span>
                {isSaving && (
                    <span className="text-2xs text-primary-400 flex items-center gap-1">
                        <Loader2 size={10} className="animate-spin" /> Salvando...
                    </span>
                )}
            </div>

            {/* New note input */}
            <div className="p-4 border-b border-white/5">
                <textarea
                    value={note}
                    onChange={(e) => onNoteChange(e.target.value)}
                    className="w-full bg-card/50 border border-white/5 rounded-lg p-3 text-sm text-muted-foreground placeholder:text-secondary-foreground resize-none focus:outline-none focus:border-primary-500/50 min-h-[160px]"
                    placeholder="Escreva uma nota..."
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.metaKey) {
                            onSubmit();
                        }
                    }}
                />
                <div className="flex justify-between items-center mt-2">
                    <span className="text-2xs text-secondary-foreground">Cmd+Enter para salvar</span>
                    <Button
                        onClick={onSubmit}
                        disabled={!note.trim() || isSaving}
                        className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
                    >
                        Adicionar
                    </Button>
                </div>
            </div>

            {/* Notes list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 size={20} className="text-muted-foreground animate-spin" />
                    </div>
                ) : notes.length === 0 ? (
                    <p className="text-sm text-secondary-foreground text-center py-8">Nenhuma nota ainda</p>
                ) : (
                    notes.map((n) => (
                        <div key={n.id} className="p-3 bg-card/30 rounded-lg border border-white/5 group">
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.content}</p>
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-2xs text-secondary-foreground">
                                    {new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <Button
                                    onClick={() => onDelete(n.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-400 transition-all"
                                >
                                    <Trash2 size={12} />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
