import React from 'react';
import { CheckCircle2, CalendarClock, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BulkActionsToolbarProps {
    selectedCount: number;
    onCompleteAll: () => void;
    onSnoozeAll: () => void;
    onDeleteAll?: () => void;
    onClearSelection: () => void;
}

export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
    selectedCount,
    onCompleteAll,
    onSnoozeAll,
    onDeleteAll,
    onClearSelection
}) => {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-300">
            <div className="bg-card text-foreground rounded-2xl shadow-2xl border border-border px-6 py-4 flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center font-bold text-sm">
                        {selectedCount}
                    </div>
                    <span className="font-medium">
                        {selectedCount === 1 ? '1 atividade selecionada' : `${selectedCount} atividades selecionadas`}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={onCompleteAll}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                    >
                        <CheckCircle2 size={16} />
                        Concluir
                    </Button>

                    <Button
                        onClick={onSnoozeAll}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                    >
                        <CalendarClock size={16} />
                        Adiar 1 Dia
                    </Button>

                    {onDeleteAll && (
                        <Button
                            onClick={onDeleteAll}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                        >
                            <Trash2 size={16} />
                            Excluir
                        </Button>
                    )}

                    <Button
                        onClick={onClearSelection}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                        title="Limpar seleção"
                    >
                        <X size={20} />
                    </Button>
                </div>
            </div>
        </div>
    );
};
