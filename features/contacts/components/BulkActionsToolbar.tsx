import React, { useState } from 'react';
import { UserCheck, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MODAL_OVERLAY_CLASS } from '@/components/ui/modalStyles';
import type { ProfileInfo } from './ContactsList';

interface BulkActionsToolbarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onReassign: (newOwnerId: string) => void;
    onExportCsv: () => void;
    profiles: ProfileInfo[];
}

/**
 * Toolbar de acoes em massa para contatos selecionados.
 * Story 3.5 — AC9: reatribuir e exportar CSV.
 */
export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
    selectedCount,
    onClearSelection,
    onReassign,
    onExportCsv,
    profiles,
}) => {
    const [showReassignModal, setShowReassignModal] = useState(false);
    const [selectedProfileId, setSelectedProfileId] = useState('');

    if (selectedCount === 0) return null;

    const handleConfirmReassign = () => {
        if (selectedProfileId) {
            onReassign(selectedProfileId);
            setShowReassignModal(false);
            setSelectedProfileId('');
        }
    };

    return (
        <>
            <div className="flex items-center gap-2">
                <Button
                    onClick={() => setShowReassignModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    <UserCheck size={14} />
                    Reatribuir
                </Button>
                <Button
                    onClick={onExportCsv}
                    className="flex items-center gap-2 px-3 py-1.5 bg-accent hover:bg-accent text-white text-sm font-medium rounded-lg transition-colors"
                >
                    <Download size={14} />
                    Exportar CSV
                </Button>
            </div>

            {/* Reassign Modal */}
            {showReassignModal && (
                <div className={MODAL_OVERLAY_CLASS}>
                    <div className="bg-white dark:bg-card rounded-xl shadow-xl border border-border p-6 w-full max-w-md mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-foreground">
                                Reatribuir Contatos
                            </h3>
                            <Button
                                onClick={() => { setShowReassignModal(false); setSelectedProfileId(''); }}
                                className="p-1 text-muted-foreground hover:text-secondary-foreground dark:hover:text-muted-foreground"
                            >
                                <X size={20} />
                            </Button>
                        </div>
                        <p className="text-sm text-secondary-foreground dark:text-muted-foreground mb-4">
                            Selecione o novo responsavel para {selectedCount} contato{selectedCount !== 1 ? 's' : ''}:
                        </p>
                        <label htmlFor="reassign-select" className="sr-only">Novo responsavel</label>
                        <select
                            id="reassign-select"
                            className="w-full bg-white dark:bg-black/20 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 mb-4"
                            value={selectedProfileId}
                            onChange={(e) => setSelectedProfileId(e.target.value)}
                        >
                            <option value="">Selecionar responsavel...</option>
                            {profiles.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <div className="flex justify-end gap-2">
                            <Button
                                onClick={() => { setShowReassignModal(false); setSelectedProfileId(''); }}
                                className="px-4 py-2 text-sm font-medium text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/5 rounded-lg transition-colors"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleConfirmReassign}
                                disabled={!selectedProfileId}
                                className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 disabled:bg-accent disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                            >
                                Confirmar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
