import React, { useState } from 'react';
import { UserCheck, Download, X, ListPlus, ListMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MODAL_OVERLAY_CLASS } from '@/components/ui/modalStyles';
import type { ProfileInfo } from './ContactsList';
import type { ContactList } from '@/types';

interface BulkActionsToolbarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onReassign: (newOwnerId: string) => void;
    onExportCsv: () => void;
    profiles: ProfileInfo[];
    // CL-1: List actions
    contactLists?: ContactList[];
    onAddToList?: (listId: string) => void;
    onRemoveFromList?: () => void;
}

/**
 * Toolbar de acoes em massa para contatos selecionados.
 * Story 3.5 — AC9: reatribuir e exportar CSV.
 * Story CL-1 — AC4/AC5: adicionar/remover de lista.
 */
export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
    selectedCount,
    onClearSelection,
    onReassign,
    onExportCsv,
    profiles,
    contactLists = [],
    onAddToList,
    onRemoveFromList,
}) => {
    const [showReassignModal, setShowReassignModal] = useState(false);
    const [selectedProfileId, setSelectedProfileId] = useState('');
    const [showListDropdown, setShowListDropdown] = useState(false);

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
                {/* CL-1: Add to List */}
                {onAddToList && contactLists.length > 0 && (
                    <div className="relative">
                        <Button
                            onClick={() => setShowListDropdown(!showListDropdown)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            <ListPlus size={14} />
                            Adicionar a Lista
                        </Button>
                        {showListDropdown && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowListDropdown(false)}
                                />
                                <div className="absolute bottom-full mb-1 left-0 z-50 w-48 bg-white dark:bg-card border border-border rounded-lg shadow-xl py-1 max-h-48 overflow-y-auto">
                                    {contactLists.map(list => (
                                        <Button
                                            key={list.id}
                                            onClick={() => {
                                                onAddToList(list.id);
                                                setShowListDropdown(false);
                                            }}
                                            className="w-full text-left px-3 py-1.5 text-sm text-foreground hover:bg-muted dark:hover:bg-white/5 flex items-center gap-2"
                                        >
                                            <span
                                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                                style={{ backgroundColor: list.color }}
                                            />
                                            <span className="truncate">{list.name}</span>
                                        </Button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* CL-1: Remove from List (only visible when filtering by a specific list) */}
                {onRemoveFromList && (
                    <Button
                        onClick={onRemoveFromList}
                        className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        <ListMinus size={14} />
                        Remover da Lista
                    </Button>
                )}

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
