import React, { useState, useMemo } from 'react';
import { useCRMActions } from '@/hooks/useCRMActions';
import { useBoards } from '@/context/boards/BoardsContext';
import { useAuth } from '@/context/AuthContext';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { Deal, Board, Contact } from '@/types';
import { X, User, Mail, Phone, AlertCircle, Loader2 } from 'lucide-react';
import { DebugFillButton } from '@/components/debug/DebugFillButton';
import { fakeDeal, fakeContact } from '@/lib/debug';
import { ContactSearchCombobox } from '@/components/ui/ContactSearchCombobox';
import { Button } from '@/app/components/ui/Button';

interface CreateDealModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** O board ativo - passado pelo controller do Kanban */
    activeBoard?: Board | null;
    /** O ID do board ativo - passado pelo controller do Kanban */
    activeBoardId?: string;
    /** Estágio pré-selecionado (quando criado pelo botão + de uma coluna específica) */
    initialStageId?: string;
    /** Callback chamado após criação bem-sucedida do deal — abre DealDetailModal */
    onCreated?: (dealId: string) => void;
}

/**
 * Modal compacto de criação rápida de deal.
 * Contém apenas os 3 campos obrigatórios: Contato, Estágio, Responsável.
 * Após criação, chama onCreated(dealId) para abrir o DealDetailModal com os detalhes.
 */
export const CreateDealModal: React.FC<CreateDealModalProps> = ({
    isOpen,
    onClose,
    activeBoard: propActiveBoard,
    activeBoardId: propActiveBoardId,
    initialStageId,
    onCreated,
}) => {
    const { addDeal } = useCRMActions();
    const { activeBoard: contextActiveBoard, activeBoardId: contextActiveBoardId } = useBoards();
    const { profile, user } = useAuth();
    const { members } = useOrganizationMembers();

    // Prioriza props sobre contexto
    const activeBoard = propActiveBoard || contextActiveBoard;
    const activeBoardId = propActiveBoardId || contextActiveBoardId;

    // Estágios disponíveis (exclui won e lost)
    const availableStages = useMemo(() => {
        if (!activeBoard?.stages) return [];
        return activeBoard.stages.filter(
            s => s.id !== activeBoard.wonStageId && s.id !== activeBoard.lostStageId
        );
    }, [activeBoard]);

    // Estado do contato
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [newContactData, setNewContactData] = useState({ name: '', email: '', phone: '' });

    // Estado do estágio selecionado
    const [selectedStageId, setSelectedStageId] = useState<string>('');

    // Estado do responsável
    const [selectedOwnerId, setSelectedOwnerId] = useState<string>(profile?.id || user?.id || '');

    // Estado de UI
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Estágio efetivo: initialStageId → stages[0]
    const effectiveStageId = selectedStageId || initialStageId || availableStages[0]?.id || '';

    const resetForm = () => {
        setSelectedContact(null);
        setIsCreatingNew(false);
        setNewContactData({ name: '', email: '', phone: '' });
        setSelectedStageId('');
        setSelectedOwnerId(profile?.id || user?.id || '');
        setError(null);
        setIsSubmitting(false);
    };

    const fillWithFakeData = () => {
        const contact = fakeContact();
        setIsCreatingNew(true);
        setNewContactData({ name: contact.name, email: contact.email, phone: contact.phone });
    };

    const handleCreateNew = (searchTerm: string) => {
        setIsCreatingNew(true);
        if (searchTerm.includes('@')) {
            setNewContactData(prev => ({ ...prev, email: searchTerm }));
        } else if (/^\d+$/.test(searchTerm.replace(/\D/g, '')) && searchTerm.length >= 8) {
            setNewContactData(prev => ({ ...prev, phone: searchTerm }));
        } else {
            setNewContactData(prev => ({ ...prev, name: searchTerm }));
        }
    };

    if (!isOpen) return null;

    if (!activeBoard || !activeBoard.stages?.length) {
        return (
            <div className="fixed inset-0 md:left-[var(--app-sidebar-width,0px)] z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-5">
                    <p className="text-slate-700 dark:text-slate-300 text-center">
                        Nenhum board selecionado ou board sem estágios.
                    </p>
                    <Button
                        onClick={onClose}
                        className="w-full mt-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-bold py-2.5 rounded-lg transition-all"
                    >
                        Fechar
                    </Button>
                </div>
            </div>
        );
    }

    const handleCreateDeal = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const selectedMember = members.find(m => m.id === selectedOwnerId);
            const ownerName = selectedMember?.name
                || profile?.nickname
                || profile?.first_name
                || (profile?.email || user?.email || '').split('@')[0]
                || 'Eu';

            const contactName = selectedContact?.name || newContactData.name;

            const deal: Omit<Deal, 'id' | 'createdAt'> = {
                title: contactName,
                contactId: selectedContact?.id || '',
                boardId: activeBoardId || activeBoard.id,
                ownerId: selectedOwnerId || user?.id || '',
                value: 0,
                items: [],
                status: effectiveStageId,
                updatedAt: new Date().toISOString(),
                probability: 10,
                priority: 'medium',
                owner: {
                    name: ownerName,
                    avatar: selectedMember?.avatar_url || profile?.avatar_url || '',
                },
                isWon: false,
                isLost: false,
                dealType: 'VENDA',
            };

            const contactInfo = selectedContact
                ? { name: selectedContact.name, email: selectedContact.email, phone: selectedContact.phone }
                : { name: newContactData.name, email: newContactData.email, phone: newContactData.phone };

            const result = await addDeal(deal, { contact: contactInfo });

            if (result === null || result === undefined) {
                setError('Não foi possível criar o negócio. Tente novamente.');
                return;
            }

            if (onCreated) {
                onCreated(result.id);
            } else {
                onClose();
            }
            resetForm();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao criar negócio. Tente novamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const hasContact = selectedContact || (isCreatingNew && newContactData.name);

    return (
        <div
            className="fixed inset-0 md:left-[var(--app-sidebar-width,0px)] z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) { onClose(); resetForm(); }
            }}
        >
            <div
                className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center sticky top-0 bg-white dark:bg-dark-card z-10">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display">Novo Negócio</h2>
                        <DebugFillButton onClick={fillWithFakeData} />
                    </div>
                    <Button onClick={() => { onClose(); resetForm(); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                        <X size={20} />
                    </Button>
                </div>

                <form onSubmit={handleCreateDeal} className="p-5 space-y-5">
                    {/* CONTATO */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <label className="text-xs font-bold text-slate-500 uppercase">Contato</label>
                            {!selectedContact && (
                                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 ml-auto">
                                    <Button
                                        type="button"
                                        onClick={() => setIsCreatingNew(false)}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                                            !isCreatingNew
                                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                    >
                                        Buscar
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => setIsCreatingNew(true)}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                                            isCreatingNew
                                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                    >
                                        + Novo
                                    </Button>
                                </div>
                            )}
                        </div>

                        {selectedContact ? (
                            <div className="flex items-center gap-3 p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                                <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center">
                                    <User size={20} className="text-primary-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-900 dark:text-white truncate">{selectedContact.name}</p>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                        {selectedContact.email && (
                                            <span className="flex items-center gap-1 truncate">
                                                <Mail size={12} />{selectedContact.email}
                                            </span>
                                        )}
                                        {selectedContact.phone && (
                                            <span className="flex items-center gap-1">
                                                <Phone size={12} />{selectedContact.phone}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => setSelectedContact(null)}
                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    ✕
                                </Button>
                            </div>
                        ) : !isCreatingNew ? (
                            <ContactSearchCombobox
                                selectedContact={selectedContact}
                                onSelectContact={setSelectedContact}
                                onCreateNew={handleCreateNew}
                            />
                        ) : (
                            <div className="space-y-3 p-4 bg-slate-50 dark:bg-black/20 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div className="relative">
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Nome do contato *"
                                        required={isCreatingNew}
                                        value={newContactData.name}
                                        onChange={(e) => setNewContactData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="email"
                                            placeholder="Email"
                                            value={newContactData.email}
                                            onChange={(e) => setNewContactData(prev => ({ ...prev, email: e.target.value }))}
                                            className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                    <div className="relative">
                                        <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="tel"
                                            placeholder="Telefone"
                                            value={newContactData.phone}
                                            onChange={(e) => setNewContactData(prev => ({ ...prev, phone: e.target.value }))}
                                            className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ESTÁGIO */}
                    <div className="pt-3 border-t border-slate-100 dark:border-white/5">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Estágio</label>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                            {availableStages.map(stage => {
                                const isSelected = effectiveStageId === stage.id;
                                return (
                                    <Button
                                        key={stage.id}
                                        type="button"
                                        onClick={() => setSelectedStageId(stage.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                                            isSelected
                                                ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-400 text-primary-700 dark:text-primary-300 shadow-sm'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stage.color}`} />
                                        {stage.label}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {/* RESPONSÁVEL */}
                    <div className="pt-3 border-t border-slate-100 dark:border-white/5">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Responsável</label>
                        <select
                            value={selectedOwnerId}
                            onChange={e => setSelectedOwnerId(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            {members.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.name}{m.id === (profile?.id || user?.id) ? ' (você)' : ''}
                                </option>
                            ))}
                            {/* Fallback se members ainda não carregou */}
                            {members.length === 0 && (
                                <option value={profile?.id || user?.id || ''}>
                                    {profile?.nickname || profile?.first_name || (profile?.email || '').split('@')[0] || 'Eu'} (você)
                                </option>
                            )}
                        </select>
                    </div>

                    {/* Erro */}
                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={!hasContact || isSubmitting}
                        className="w-full bg-primary-600 hover:bg-primary-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg mt-2 shadow-lg shadow-primary-600/20 transition-all flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Criando...
                            </>
                        ) : (
                            'Criar Negócio'
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
};
