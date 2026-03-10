// =============================================================================
// DataStorageSettings - Configurações de armazenamento de dados (SIMPLIFICADO)
// =============================================================================

import React from 'react';
import { Database, AlertTriangle, Trash2, Loader2, Unlink, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfirmModal from '@/components/ConfirmModal';
import { useCRMActions } from '@/hooks/useCRMActions';
import { useContacts } from '@/context/contacts/ContactsContext';
import { useActivities } from '@/context/activities/ActivitiesContext';
import { useBoards } from '@/context/boards/BoardsContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useDangerZone, useOrphanDeals } from './hooks';

/**
 * Componente React `DataStorageSettings`.
 * @returns {Element} Retorna um valor do tipo `Element`.
 */
export const DataStorageSettings: React.FC = () => {
    const { deals } = useCRMActions();
    const { contacts } = useContacts();
    const { activities } = useActivities();
    const { boards } = useBoards();
    const refresh = async () => {
        // No-op: React Query invalidation handles data refresh
    };
    const { profile } = useAuth();
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    const sb = supabase;
    const isAdmin = profile?.role === 'admin';

    const {
        showDangerZone, setShowDangerZone,
        confirmText, setConfirmText,
        isDeleting, handleNukeDatabase,
    } = useDangerZone({ addToast, sb, queryClient, refresh });

    const stats = {
        contacts: contacts.length,
        deals: deals.length,
        activities: activities.length,
        boards: boards.length,
    };

    const totalRecords = stats.contacts + stats.deals + stats.activities + stats.boards;

    return (
        <div className="space-y-6">
            {/* Data Statistics */}
            <div className="bg-white dark:bg-dark-card rounded-lg border border-border dark:border-dark-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Estatísticas do Sistema
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-background dark:bg-dark-bg rounded-lg text-center">
                        <div className="text-2xl font-bold text-foreground">{stats.contacts}</div>
                        <div className="text-sm text-muted-foreground dark:text-muted-foreground">Contatos</div>
                    </div>
                    <div className="p-4 bg-background dark:bg-dark-bg rounded-lg text-center">
                        <div className="text-2xl font-bold text-foreground">{stats.deals}</div>
                        <div className="text-sm text-muted-foreground dark:text-muted-foreground">Negócios</div>
                    </div>
                    <div className="p-4 bg-background dark:bg-dark-bg rounded-lg text-center">
                        <div className="text-2xl font-bold text-foreground">{stats.activities}</div>
                        <div className="text-sm text-muted-foreground dark:text-muted-foreground">Atividades</div>
                    </div>
                    <div className="p-4 bg-background dark:bg-dark-bg rounded-lg text-center">
                        <div className="text-2xl font-bold text-foreground">{stats.boards}</div>
                        <div className="text-sm text-muted-foreground dark:text-muted-foreground">Boards</div>
                    </div>
                </div>
            </div>

            {/* Orphan Deals - Data Health (AC13, AC14) */}
            {isAdmin && <OrphanDealsSection />}

            {/* Danger Zone - Só para Admin */}
            {isAdmin && (
                <div className="bg-white dark:bg-dark-card rounded-lg border border-red-200 dark:border-red-900/50 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Zona de Perigo
                        </h3>
                        <Button
                            onClick={() => setShowDangerZone(!showDangerZone)}
                            className="text-sm text-muted-foreground hover:text-secondary-foreground dark:hover:text-muted-foreground"
                        >
                            {showDangerZone ? 'Esconder' : 'Mostrar'}
                        </Button>
                    </div>

                    {showDangerZone && (
                        <div className="space-y-4">
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                                <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                                    <strong>⚠️ ATENÇÃO:</strong> Esta ação vai excluir permanentemente:
                                </p>
                                <ul className="text-sm text-red-600 dark:text-red-400 list-disc list-inside space-y-1">
                                    <li>{stats.deals} negócios</li>
                                    <li>{stats.contacts} contatos</li>
                                    <li>{stats.activities} atividades</li>
                                    <li>{stats.boards} boards (e seus stages)</li>
                                    <li>Todas as tags e produtos</li>
                                </ul>
                                <p className="text-sm text-red-700 dark:text-red-300 mt-3 font-medium">
                                    Total: {totalRecords} registros serão apagados!
                                </p>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-secondary-foreground dark:text-muted-foreground">
                                    Digite <span className="font-mono bg-red-100 dark:bg-red-900/30 px-1 rounded">DELETAR TUDO</span> para confirmar:
                                </label>
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="DELETAR TUDO"
                                    className="w-full px-4 py-2 bg-white dark:bg-dark-bg border border-red-300 dark:border-red-800 rounded-lg text-foreground focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                />
                                <Button
                                    onClick={handleNukeDatabase}
                                    disabled={confirmText !== 'DELETAR TUDO' || isDeleting}
                                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${confirmText === 'DELETAR TUDO' && !isDeleting
                                            ? 'bg-red-600 hover:bg-red-700 text-white'
                                            : 'bg-accent dark:bg-dark-hover text-muted-foreground cursor-not-allowed'
                                        }`}
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Deletando...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4" />
                                            💣 Zerar Database
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------
// OrphanDealsSection — Data health card for deals without contact (DB-003)
// ---------------------------------------------------------------------------

const OrphanDealsSection: React.FC = () => {
    const sb = supabase;
    const { addToast } = useToast();
    const { contacts } = useContacts();
    const queryClient = useQueryClient();

    const {
        count, orphans, loading, expanded,
        selected, assignContactId, setAssignContactId,
        actionLoading, showDeleteConfirm, setShowDeleteConfirm,
        toggleExpand, toggleSelect, selectAll,
        handleAssign, handleDelete,
    } = useOrphanDeals({ sb, addToast, queryClient });

    if (count === null || count === 0) return null;

    return (
        <>
        <div className="bg-white dark:bg-dark-card rounded-lg border border-amber-200 dark:border-amber-900/50 p-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <Unlink className="w-5 h-5" />
                    Deals Órfãos
                </h3>
                <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-amber-600 dark:text-amber-300">{count}</span>
                    <Button
                        type="button"
                        onClick={toggleExpand}
                        className="text-sm text-amber-700 dark:text-amber-300 underline"
                    >
                        {expanded ? 'Recolher' : 'Ver detalhes'}
                    </Button>
                </div>
            </div>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
                Negócios sem contato vinculado. Podem ser atribuídos a um contato ou excluídos.
            </p>

            {expanded && (
                <div className="mt-4 space-y-3">
                    {loading ? (
                        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</div>
                    ) : orphans.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum deal órfão encontrado.</p>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 mb-2">
                                <Button type="button" onClick={selectAll} className="text-xs text-secondary-foreground dark:text-muted-foreground underline">
                                    {selected.size === orphans.length ? 'Desmarcar todos' : 'Selecionar todos'}
                                </Button>
                                <span className="text-xs text-muted-foreground">{selected.size} selecionado(s)</span>
                            </div>

                            <div className="max-h-60 overflow-y-auto border border-border rounded-lg divide-y divide-border dark:divide-white/5">
                                {orphans.map(o => (
                                    <label key={o.id} className="flex items-center gap-3 px-3 py-2 hover:bg-background dark:hover:bg-white/5 cursor-pointer">
                                        <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleSelect(o.id)} className="rounded" />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-foreground truncate">{o.title}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {o.value != null ? `R$ ${o.value.toLocaleString('pt-BR')}` : 'Sem valor'}
                                                {' · '}
                                                {new Date(o.updated_at).toLocaleDateString('pt-BR')}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>

                            {selected.size > 0 && (
                                <div className="flex flex-wrap items-end gap-3 pt-2">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-xs font-medium text-secondary-foreground dark:text-muted-foreground mb-1">Atribuir ao contato:</label>
                                        <select
                                            value={assignContactId}
                                            onChange={e => setAssignContactId(e.target.value)}
                                            className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-bg border border-border rounded-lg"
                                        >
                                            <option value="">Selecione um contato...</option>
                                            {contacts.slice(0, 100).map(c => (
                                                <option key={c.id} value={c.id}>{c.name} {c.email ? `(${c.email})` : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={handleAssign}
                                        disabled={!assignContactId || actionLoading}
                                        className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium inline-flex items-center gap-2"
                                    >
                                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                        Atribuir
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        disabled={actionLoading}
                                        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium inline-flex items-center gap-2"
                                    >
                                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        Excluir
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>

        <ConfirmModal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={() => {
                setShowDeleteConfirm(false);
                handleDelete();
            }}
            title="Excluir deals órfãos"
            message={`Tem certeza que deseja excluir ${selected.size} deal(s) órfão(s)? Esta ação não pode ser desfeita.`}
            confirmText="Excluir"
            variant="danger"
        />
        </>
    );
};

export default DataStorageSettings;
