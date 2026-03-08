// =============================================================================
// DataStorageSettings - Configurações de armazenamento de dados (SIMPLIFICADO)
// =============================================================================

import React, { useCallback, useEffect, useState } from 'react';
import { Database, AlertTriangle, Trash2, Loader2, Unlink, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCRMActions } from '@/hooks/useCRMActions';
import { useContacts } from '@/context/contacts/ContactsContext';
import { useActivities } from '@/context/activities/ActivitiesContext';
import { useBoards } from '@/context/boards/BoardsContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query';

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

    const [showDangerZone, setShowDangerZone] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const isAdmin = profile?.role === 'admin';

    // Estatísticas
    const stats = {
        contacts: contacts.length,
        deals: deals.length,
        activities: activities.length,
        boards: boards.length,
    };

    const totalRecords = stats.contacts + stats.deals + stats.activities + stats.boards;

    const handleNukeDatabase = async () => {
        if (confirmText !== 'DELETAR TUDO') {
            addToast('Digite "DELETAR TUDO" para confirmar', 'error');
            return;
        }

        if (!sb) {
            addToast('Supabase não está configurado neste ambiente.', 'error');
            return;
        }

        setIsDeleting(true);

        try {
            // Ordem importa por causa das FKs!
            // 0. Limpar referências de stages/boards dentro de `boards` (FK boards.won_stage_id/lost_stage_id -> board_stages)
            // Se não zerarmos isso antes, o delete de `board_stages` falha com:
            // "violates foreign key constraint boards_won_stage_id_fkey".
            const { error: boardsRefsError } = await sb
                .from('boards')
                .update({ won_stage_id: null, lost_stage_id: null, next_board_id: null })
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all
            if (boardsRefsError) throw boardsRefsError;

            // 0.1 Integrações/Webhooks (novas FKs para board_stages/boards)
            // Se houver fontes de entrada apontando para um stage, o delete de `board_stages` falha com:
            // "violates foreign key constraint integration_inbound_sources_entry_stage_id_fkey".
            // Por isso, limpamos tudo que depende de integrações antes de mexer em stages/boards.
            //
            // Ordem sugerida:
            // - webhook_deliveries -> webhook_events_out -> webhook_events_in -> endpoints -> inbound_sources
            const { error: deliveriesError } = await sb
                .from('webhook_deliveries')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');
            if (deliveriesError) console.warn('Aviso: erro ao limpar webhook_deliveries:', deliveriesError);

            const { error: eventsOutError } = await sb
                .from('webhook_events_out')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');
            if (eventsOutError) console.warn('Aviso: erro ao limpar webhook_events_out:', eventsOutError);

            const { error: eventsInError } = await sb
                .from('webhook_events_in')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');
            if (eventsInError) console.warn('Aviso: erro ao limpar webhook_events_in:', eventsInError);

            const { error: outboundError } = await sb
                .from('integration_outbound_endpoints')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');
            if (outboundError) console.warn('Aviso: erro ao limpar integration_outbound_endpoints:', outboundError);

            const { error: inboundError } = await sb
                .from('integration_inbound_sources')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');
            if (inboundError) console.warn('Aviso: erro ao limpar integration_inbound_sources:', inboundError);

            // 1. Activities (depende de deals)
            const { error: activitiesError } = await sb.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (activitiesError) throw activitiesError;

            // 2. Deal Items (depende de deals)
            const { error: itemsError } = await sb.from('deal_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (itemsError) throw itemsError;

            // 3. Deals (depende de boards, contacts, companies)
            const { error: dealsError } = await sb.from('deals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (dealsError) throw dealsError;

            // 0. Limpar referência de Active Board em user_settings (evita erro de FK)
            const { error: userSettingsError } = await sb
                .from('user_settings')
                .update({ active_board_id: null })
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all
            if (userSettingsError) console.warn('Aviso: erro ao limpar user_settings (pode não existir ainda):', userSettingsError);

            // 4. Board Stages (depende de boards)
            const { error: stagesError } = await sb.from('board_stages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (stagesError) throw stagesError;

            // 5. Boards
            const { error: boardsError } = await sb.from('boards').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (boardsError) throw boardsError;

            // 6. Contacts
            const { error: contactsError } = await sb.from('contacts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (contactsError) throw contactsError;

            // 7. Tags
            const { error: tagsError } = await sb.from('tags').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (tagsError) throw tagsError;

            // 9. Products
            const { error: productsError } = await sb.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (productsError) throw productsError;

            // Invalida todo o cache do React Query
            await queryClient.invalidateQueries();

            // IMPORTANT: invalidate does not clear cached data; if user navigates back to /boards,
            // stale cached boards can still render until a refetch happens (which we intentionally reduced).
            // For the nuke flow, we want the UI to reflect "zero boards" immediately.
            queryClient.removeQueries({ queryKey: queryKeys.boards.all });
            queryClient.removeQueries({ queryKey: [...queryKeys.boards.all, 'default'] as const });
            // Also clear deals cache because /boards renders deals for active board.
            queryClient.removeQueries({ queryKey: queryKeys.deals.all });

            // Força refresh de todos os contexts (Activities, Deals, etc.)
            await refresh();

            addToast('🔥 Database zerado com sucesso!', 'success');
            setConfirmText('');
            setShowDangerZone(false);

        } catch (error: unknown) {
            console.error('Erro ao zerar database:', error);
            addToast(`Erro: ${error instanceof Error ? error.message : String(error)}`, 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Data Statistics */}
            <div className="bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-border p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Estatísticas do Sistema
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-dark-bg rounded-lg text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.contacts}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Contatos</div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-dark-bg rounded-lg text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.deals}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Negócios</div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-dark-bg rounded-lg text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activities}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Atividades</div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-dark-bg rounded-lg text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.boards}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Boards</div>
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
                            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
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
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Digite <span className="font-mono bg-red-100 dark:bg-red-900/30 px-1 rounded">DELETAR TUDO</span> para confirmar:
                                </label>
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="DELETAR TUDO"
                                    className="w-full px-4 py-2 bg-white dark:bg-dark-bg border border-red-300 dark:border-red-800 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                />
                                <Button
                                    onClick={handleNukeDatabase}
                                    disabled={confirmText !== 'DELETAR TUDO' || isDeleting}
                                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${confirmText === 'DELETAR TUDO' && !isDeleting
                                            ? 'bg-red-600 hover:bg-red-700 text-white'
                                            : 'bg-slate-200 dark:bg-dark-hover text-slate-400 cursor-not-allowed'
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

interface OrphanDeal {
    id: string;
    title: string;
    value: number | null;
    status: string | null;
    board_id: string | null;
    created_at: string;
    updated_at: string;
}

const OrphanDealsSection: React.FC = () => {
    const sb = supabase;
    const { addToast } = useToast();
    const { contacts } = useContacts();
    const queryClient = useQueryClient();

    const [count, setCount] = useState<number | null>(null);
    const [orphans, setOrphans] = useState<OrphanDeal[]>([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [assignContactId, setAssignContactId] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const fetchCount = useCallback(async () => {
        if (!sb) return;
        const { data, error } = await sb.rpc('get_orphan_deals_count');
        if (!error && typeof data === 'number') setCount(data);
    }, [sb]);

    useEffect(() => { fetchCount(); }, [fetchCount]);

    const fetchOrphans = async () => {
        if (!sb) return;
        setLoading(true);
        const { data, error } = await sb.rpc('list_orphan_deals', { p_limit: 50, p_offset: 0 });
        if (error) {
            addToast('Erro ao carregar deals órfãos', 'error');
        } else {
            setOrphans((data ?? []) as OrphanDeal[]);
        }
        setLoading(false);
    };

    const toggleExpand = () => {
        if (!expanded) fetchOrphans();
        setExpanded(!expanded);
    };

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selected.size === orphans.length) setSelected(new Set());
        else setSelected(new Set(orphans.map(o => o.id)));
    };

    const handleAssign = async () => {
        if (!sb || !assignContactId || selected.size === 0) return;
        setActionLoading(true);
        const { data, error } = await sb.rpc('assign_orphan_deals_to_contact', {
            p_deal_ids: Array.from(selected),
            p_contact_id: assignContactId,
        });
        if (error) {
            addToast(error.message || 'Erro ao atribuir deals', 'error');
        } else {
            addToast(`${data} deal(s) atribuído(s) ao contato`, 'success');
            setSelected(new Set());
            setAssignContactId('');
            await fetchCount();
            await fetchOrphans();
            await queryClient.invalidateQueries({ queryKey: queryKeys.deals.all });
        }
        setActionLoading(false);
    };

    const handleDelete = async () => {
        if (!sb || selected.size === 0) return;
        if (!window.confirm(`Tem certeza que deseja excluir ${selected.size} deal(s) órfão(s)?`)) return;
        setActionLoading(true);
        const { data, error } = await sb.rpc('delete_orphan_deals', {
            p_deal_ids: Array.from(selected),
        });
        if (error) {
            addToast(error.message || 'Erro ao excluir deals', 'error');
        } else {
            addToast(`${data} deal(s) excluído(s)`, 'success');
            setSelected(new Set());
            await fetchCount();
            await fetchOrphans();
            await queryClient.invalidateQueries({ queryKey: queryKeys.deals.all });
        }
        setActionLoading(false);
    };

    if (count === null || count === 0) return null;

    return (
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
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Negócios sem contato vinculado. Podem ser atribuídos a um contato ou excluídos.
            </p>

            {expanded && (
                <div className="mt-4 space-y-3">
                    {loading ? (
                        <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</div>
                    ) : orphans.length === 0 ? (
                        <p className="text-sm text-slate-500">Nenhum deal órfão encontrado.</p>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 mb-2">
                                <Button type="button" onClick={selectAll} className="text-xs text-slate-600 dark:text-slate-300 underline">
                                    {selected.size === orphans.length ? 'Desmarcar todos' : 'Selecionar todos'}
                                </Button>
                                <span className="text-xs text-slate-500">{selected.size} selecionado(s)</span>
                            </div>

                            <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-white/10 rounded-lg divide-y divide-slate-100 dark:divide-white/5">
                                {orphans.map(o => (
                                    <label key={o.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer">
                                        <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleSelect(o.id)} className="rounded" />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{o.title}</div>
                                            <div className="text-xs text-slate-500">
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
                                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Atribuir ao contato:</label>
                                        <select
                                            value={assignContactId}
                                            onChange={e => setAssignContactId(e.target.value)}
                                            className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-bg border border-slate-200 dark:border-white/10 rounded-lg"
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
                                        onClick={handleDelete}
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
    );
};

export default DataStorageSettings;
