import React from 'react';
import { Mail, Phone, Plus, Calendar, Pencil, Trash2, Flame, Thermometer, Snowflake, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Contact, ContactSortableColumn, ContactClassification, ContactTemperature } from '@/types';
import { StageBadge } from './ContactsStageTabs';
import { Button } from '@/app/components/ui/Button';

// Performance: reuse Intl formatters (they are relatively expensive to instantiate).
const PT_BR_DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR');
const PT_BR_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

/**
 * Formata uma data para exibicao relativa (ex: "Hoje", "Ontem", "Ha 3 dias", "15/11/2024")
 */
function formatRelativeDate(dateString: string | undefined | null, now: Date): string {
    if (!dateString) return '---';

    const date = new Date(dateString);

    // Reset hours for accurate day comparison
    const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffTime = today.getTime() - dateDay.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `Ha ${diffDays} dias`;
    if (diffDays < 30) return `Ha ${Math.floor(diffDays / 7)} sem.`;

    // For older dates, show the actual date
    return PT_BR_DATE_FORMATTER.format(date);
}

// ============================================
// Story 3.1 — Classification Badge
// ============================================
const CLASSIFICATION_CONFIG: Record<ContactClassification, { label: string; color: string }> = {
    COMPRADOR: { label: 'Comprador', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' },
    VENDEDOR: { label: 'Vendedor', color: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20' },
    LOCATARIO: { label: 'Locatario', color: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20' },
    LOCADOR: { label: 'Locador', color: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20' },
    INVESTIDOR: { label: 'Investidor', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' },
    PERMUTANTE: { label: 'Permutante', color: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-500/10 dark:text-pink-400 dark:border-pink-500/20' },
};

const ClassificationBadge: React.FC<{ classification?: ContactClassification }> = ({ classification }) => {
    if (!classification) return <span className="text-xs text-slate-400">---</span>;
    const config = CLASSIFICATION_CONFIG[classification];
    if (!config) return <span className="text-xs text-slate-400">{classification}</span>;
    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.color}`}>
            {config.label}
        </span>
    );
};

// ============================================
// Story 3.1 — Temperature Icon
// ============================================
const TEMPERATURE_CONFIG: Record<ContactTemperature, { label: string; icon: React.ReactNode; color: string }> = {
    HOT: {
        label: 'Quente',
        icon: <Flame size={14} />,
        color: 'text-red-500 dark:text-red-400',
    },
    WARM: {
        label: 'Morno',
        icon: <Thermometer size={14} />,
        color: 'text-amber-500 dark:text-amber-400',
    },
    COLD: {
        label: 'Frio',
        icon: <Snowflake size={14} />,
        color: 'text-blue-500 dark:text-blue-400',
    },
};

const TemperatureIcon: React.FC<{ temperature?: ContactTemperature }> = ({ temperature }) => {
    if (!temperature) return null;
    const config = TEMPERATURE_CONFIG[temperature];
    if (!config) return null;
    return (
        <span className={`flex items-center gap-1 ${config.color}`} title={config.label}>
            {config.icon}
            <span className="text-[10px] font-bold">{config.label}</span>
        </span>
    );
};

/** Props for sortable column header */
interface SortableHeaderProps {
    label: string;
    column: ContactSortableColumn;
    currentSort: ContactSortableColumn;
    sortOrder: 'asc' | 'desc';
    onSort: (column: ContactSortableColumn) => void;
}

/** Sortable column header component */
const SortableHeader: React.FC<SortableHeaderProps> = ({ label, column, currentSort, sortOrder, onSort }) => {
    const isActive = currentSort === column;

    return (
        <th scope="col" className="px-6 py-4">
            <Button
                onClick={() => onSort(column)}
                className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200 font-display text-xs uppercase tracking-wider hover:text-primary-600 dark:hover:text-primary-400 transition-colors group"
                aria-label={`Ordenar por ${label}`}
            >
                {label}
                <span className={`transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                    {isActive ? (
                        sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    ) : (
                        <ArrowUpDown size={14} />
                    )}
                </span>
            </Button>
        </th>
    );
};

const HEADER_CLASS = 'px-6 py-4 font-bold text-slate-700 dark:text-slate-200 font-display text-xs uppercase tracking-wider';

interface ContactsListProps {
    filteredContacts: Contact[];
    selectedIds: Set<string>;
    toggleSelect: (id: string) => void;
    toggleSelectAll: () => void;
    updateContact: (id: string, data: Partial<Contact>) => void;
    convertContactToDeal: (id: string) => void;
    openEditModal: (contact: Contact) => void;
    setDeleteId: (id: string) => void;
    // Sorting props
    sortBy?: ContactSortableColumn;
    sortOrder?: 'asc' | 'desc';
    onSort?: (column: ContactSortableColumn) => void;
}

/**
 * Componente React `ContactsList` — Story 3.1 com classificacao e temperatura.
 */
export const ContactsList: React.FC<ContactsListProps> = ({
    filteredContacts,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    updateContact,
    convertContactToDeal,
    openEditModal,
    setDeleteId,
    sortBy = 'created_at',
    sortOrder = 'desc',
    onSort,
}) => {
    const activeListIds = filteredContacts.map(c => c.id);
    const allSelected = activeListIds.length > 0 && selectedIds.size === activeListIds.length;

    const someSelected = selectedIds.size > 0 && selectedIds.size < activeListIds.length;

    // Performance: avoid creating `new Date()` for each row in formatRelativeDate.
    const now = React.useMemo(() => new Date(), []);

    return (
        <div className="glass rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/80 dark:bg-white/5 border-b border-slate-200 dark:border-white/5">
                            <tr>
                                <th scope="col" className="w-12 px-6 py-4">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        ref={(el) => { if (el) el.indeterminate = someSelected; }}
                                        onChange={toggleSelectAll}
                                        aria-label={allSelected ? 'Desmarcar todos os contatos' : 'Selecionar todos os contatos'}
                                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:bg-white/5 dark:border-white/10"
                                    />
                                </th>
                                {onSort ? (
                                    <SortableHeader label="Nome" column="name" currentSort={sortBy} sortOrder={sortOrder} onSort={onSort} />
                                ) : (
                                    <th scope="col" className={HEADER_CLASS}>Nome</th>
                                )}
                                <th scope="col" className={HEADER_CLASS}>Classificacao</th>
                                <th scope="col" className={HEADER_CLASS}>Temp.</th>
                                <th scope="col" className={HEADER_CLASS}>Estagio</th>
                                <th scope="col" className={HEADER_CLASS}>Contato</th>
                                <th scope="col" className={HEADER_CLASS}>Status</th>
                                {onSort ? (
                                    <SortableHeader label="Criado" column="created_at" currentSort={sortBy} sortOrder={sortOrder} onSort={onSort} />
                                ) : (
                                    <th scope="col" className={HEADER_CLASS}>Criado</th>
                                )}
                                <th scope="col" className={HEADER_CLASS}><span className="sr-only">Acoes</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {filteredContacts.map((contact) => (
                                <tr key={contact.id} className={`hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group ${selectedIds.has(contact.id) ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}>
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(contact.id)}
                                            onChange={() => toggleSelect(contact.id)}
                                            aria-label={`Selecionar ${contact.name}`}
                                            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:bg-white/5 dark:border-white/10"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Button
                                                type="button"
                                                onClick={() => openEditModal(contact)}
                                                className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 text-primary-700 dark:text-primary-200 flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white dark:ring-white/5 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-card"
                                                aria-label={`Editar contato: ${contact.name || 'Sem nome'}`}
                                                title={contact.name || 'Sem nome'}
                                            >
                                                {(contact.name || '?').charAt(0)}
                                            </Button>
                                            <div>
                                                <span className="font-semibold text-slate-900 dark:text-white block">{contact.name}</span>
                                            </div>
                                        </div>
                                    </td>
                                    {/* Story 3.1 — Classificacao */}
                                    <td className="px-6 py-4">
                                        <ClassificationBadge classification={contact.classification} />
                                    </td>
                                    {/* Story 3.1 — Temperatura */}
                                    <td className="px-6 py-4">
                                        <TemperatureIcon temperature={contact.temperature} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <StageBadge stage={contact.stage} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs">
                                                <Mail size={12} /> {contact.email || '---'}
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs">
                                                <Phone size={12} /> {contact.phone || '---'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                onClick={() => {
                                                    const nextStatus = contact.status === 'ACTIVE' ? 'INACTIVE' : contact.status === 'INACTIVE' ? 'CHURNED' : 'ACTIVE';
                                                    updateContact(contact.id, { status: nextStatus });
                                                }}
                                                aria-label={`Alterar status de ${contact.name} de ${contact.status === 'ACTIVE' ? 'ativo' : contact.status === 'INACTIVE' ? 'inativo' : 'perdido'}`}
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${contact.status === 'ACTIVE' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' :
                                                    contact.status === 'INACTIVE' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20' :
                                                        'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                                                    }`}
                                            >
                                                {contact.status === 'ACTIVE' ? 'ATIVO' : contact.status === 'INACTIVE' ? 'INATIVO' : 'PERDIDO'}
                                            </Button>
                                            <Button
                                                onClick={() => convertContactToDeal(contact.id)}
                                                className="p-1 text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                                aria-label={`Criar oportunidade para ${contact.name}`}
                                            >
                                                <Plus size={14} aria-hidden="true" />
                                            </Button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div
                                            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs"
                                            title={contact.createdAt ? PT_BR_DATE_TIME_FORMATTER.format(new Date(contact.createdAt)) : undefined}
                                        >
                                            <Calendar size={14} className="text-slate-400" />
                                            <span>{formatRelativeDate(contact.createdAt, now)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <Button
                                                onClick={() => openEditModal(contact)}
                                                className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                                aria-label={`Editar ${contact.name}`}
                                            >
                                                <Pencil size={16} aria-hidden="true" />
                                            </Button>
                                            <Button
                                                onClick={() => setDeleteId(contact.id)}
                                                className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-slate-400 hover:text-red-500 transition-colors"
                                                aria-label={`Excluir ${contact.name}`}
                                            >
                                                <Trash2 size={16} aria-hidden="true" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
            </div>
        </div>
    );
};
