import React, { useState, useRef, useEffect } from 'react';
import { Mail, Phone, Plus, Calendar, Pencil, Trash2, Flame, Thermometer, Snowflake, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, Users } from 'lucide-react';
import { Contact, ContactSortableColumn, ContactClassification, ContactTemperature } from '@/types';
import { StageBadge } from './ContactsStageTabs';
import { Button } from '@/components/ui/button';

// ============================================
// Story 3.5 — Source Badge Config
// ============================================
const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
    WEBSITE: { label: 'Website', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' },
    LINKEDIN: { label: 'LinkedIn', color: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20' },
    REFERRAL: { label: 'Indicacao', color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' },
    MANUAL: { label: 'Manual', color: 'bg-muted text-secondary-foreground border-border dark:bg-accent/10 dark:text-muted-foreground dark:border-border/20' },
};

const SourceBadge: React.FC<{ source?: string }> = ({ source }) => {
    if (!source) return <span className="text-xs text-muted-foreground">---</span>;
    const config = SOURCE_CONFIG[source];
    if (!config) return <span className="text-xs text-muted-foreground">{source}</span>;
    return (
        <span className={`text-2xs font-bold px-2 py-0.5 rounded-full border ${config.color}`}>
            {config.label}
        </span>
    );
};

/** Profile info for owner display */
export interface ProfileInfo {
    id: string;
    name: string;
    avatar?: string;
}

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
    if (!classification) return <span className="text-xs text-muted-foreground">---</span>;
    const config = CLASSIFICATION_CONFIG[classification];
    if (!config) return <span className="text-xs text-muted-foreground">{classification}</span>;
    return (
        <span className={`text-2xs font-bold px-2 py-0.5 rounded-full border ${config.color}`}>
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
            <span className="text-2xs font-bold">{config.label}</span>
        </span>
    );
};

// ============================================
// Story 3.8 — Lead Score Badge
// ============================================
const SCORE_CONFIG = [
    { max: 30, label: 'Frio', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' },
    { max: 60, label: 'Morno', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' },
    { max: 100, label: 'Quente', color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' },
] as const;

const LeadScoreBadge: React.FC<{ score?: number }> = ({ score }) => {
    if (score == null) return <span className="text-xs text-muted-foreground">---</span>;
    const config = SCORE_CONFIG.find(c => score <= c.max) || SCORE_CONFIG[2];
    return (
        <span className={`text-2xs font-bold px-2 py-0.5 rounded-full border ${config.color}`}>
            {score}
        </span>
    );
};

// ============================================
// Status Dropdown
// ============================================
const STATUS_OPTIONS = [
    { value: 'ACTIVE' as const, label: 'ATIVO', color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' },
    { value: 'INACTIVE' as const, label: 'INATIVO', color: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20' },
    { value: 'CHURNED' as const, label: 'PERDIDO', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' },
] as const;

const StatusDropdown: React.FC<{
    status: 'ACTIVE' | 'INACTIVE' | 'CHURNED';
    contactName: string;
    onChange: (status: 'ACTIVE' | 'INACTIVE' | 'CHURNED') => void;
}> = ({ status, contactName, onChange }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [open]);

    const current = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];

    return (
        <div className="relative" ref={ref}>
            <Button
                onClick={() => setOpen(prev => !prev)}
                aria-label={`Status de ${contactName}: ${current.label}. Clique para alterar.`}
                aria-expanded={open}
                aria-haspopup="listbox"
                className={`text-2xs font-bold px-2 py-0.5 rounded-full border transition-all inline-flex items-center gap-1 ${current.color}`}
            >
                {current.label}
                <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </Button>
            {open && (
                <div
                    role="listbox"
                    aria-label="Selecionar status"
                    className="absolute z-50 mt-1 left-0 min-w-[100px] rounded-lg border border-border bg-white dark:bg-card shadow-lg py-1"
                >
                    {STATUS_OPTIONS.map(option => (
                        <Button
                            key={option.value}
                            variant="ghost"
                            role="option"
                            aria-selected={option.value === status}
                            onClick={() => {
                                if (option.value !== status) onChange(option.value);
                                setOpen(false);
                            }}
                            className={`w-full justify-start px-3 py-1.5 text-xs font-medium transition-colors hover:bg-background dark:hover:bg-white/5 h-auto rounded-none ${option.value === status ? 'font-bold' : ''}`}
                        >
                            <span className={`inline-block text-2xs font-bold px-2 py-0.5 rounded-full border ${option.color}`}>
                                {option.label}
                            </span>
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
};

/** Props for sortable column header */
interface SortableHeaderProps {
    label: string;
    column: ContactSortableColumn;
    currentSort: ContactSortableColumn;
    sortOrder: 'asc' | 'desc';
    onSort: (column: ContactSortableColumn) => void;
    className?: string;
}

/** Sortable column header component */
const SortableHeader: React.FC<SortableHeaderProps> = ({ label, column, currentSort, sortOrder, onSort, className }) => {
    const isActive = currentSort === column;

    return (
        <th scope="col" className={`px-6 py-4 ${className || ''}`}>
            <Button
                onClick={() => onSort(column)}
                className="flex items-center gap-1.5 font-bold text-secondary-foreground dark:text-muted-foreground font-display text-xs uppercase tracking-wider hover:text-primary-600 dark:hover:text-primary-400 transition-colors group"
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

const HEADER_CLASS = 'px-6 py-4 font-bold text-secondary-foreground dark:text-muted-foreground font-display text-xs uppercase tracking-wider';
const STICKY_Z = 'sticky z-20 left-0';
const STICKY_HEADER_BG = 'bg-background dark:bg-card';
const STICKY_ROW_BG = 'bg-white dark:bg-card';
const STICKY_ROW_SELECTED_BG = 'bg-primary-50 dark:bg-card';

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
    // Story 3.5 props
    profiles?: ProfileInfo[];
    totalCount?: number;
    /** Opens the contact detail modal */
    openDetailModal?: (contactId: string) => void;
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
    profiles = [],
    totalCount,
    openDetailModal,
}) => {
    // Story 3.5 — Map profiles for quick lookup
    const profilesMap = React.useMemo(() => {
        const map = new Map<string, ProfileInfo>();
        for (const p of profiles) {
            map.set(p.id, p);
        }
        return map;
    }, [profiles]);
    const activeListIds = filteredContacts.map(c => c.id);
    const allSelected = activeListIds.length > 0 && selectedIds.size === activeListIds.length;

    const someSelected = selectedIds.size > 0 && selectedIds.size < activeListIds.length;

    // Performance: avoid creating `new Date()` for each row in formatRelativeDate.
    const now = React.useMemo(() => new Date(), []);

    if (filteredContacts.length === 0) {
        return (
            <div className="glass rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-muted dark:bg-white/5 flex items-center justify-center mb-4">
                        <Users size={24} className="text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-semibold text-secondary-foreground dark:text-muted-foreground mb-1">
                        Nenhum contato encontrado
                    </h3>
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground max-w-xs">
                        Tente ajustar os filtros ou crie um novo contato.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="glass overflow-hidden w-full max-w-full">
            {/* Story 3.5 — Result count (fixed, not scrollable) */}
            {totalCount !== undefined && (
                <div className="px-6 py-2 border-b border-border bg-background/50 dark:bg-white/[0.02]">
                    <span className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                        {totalCount} contato{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}
                    </span>
                </div>
            )}
            <div className="w-full overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-background/80 dark:bg-white/5 border-b border-border">
                            <tr>
                                <th scope="col" className={`${STICKY_Z} ${STICKY_HEADER_BG} min-w-[250px] px-4 py-4`}>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            ref={(el) => { if (el) el.indeterminate = someSelected; }}
                                            onChange={toggleSelectAll}
                                            aria-label={allSelected ? 'Desmarcar todos os contatos' : 'Selecionar todos os contatos'}
                                            className="rounded border-border text-primary-600 focus:ring-primary-500 dark:bg-white/5"
                                        />
                                        {onSort ? (
                                            <Button
                                                onClick={() => onSort('name')}
                                                className="group inline-flex items-center gap-1.5 font-bold text-secondary-foreground dark:text-muted-foreground font-display text-xs uppercase tracking-wider hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                            >
                                                Nome
                                                <span className={`transition-opacity ${sortBy === 'name' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                                                    {sortBy === 'name' ? (
                                                        sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                                    ) : (
                                                        <ArrowUpDown size={14} />
                                                    )}
                                                </span>
                                            </Button>
                                        ) : (
                                            <span className="font-bold text-secondary-foreground dark:text-muted-foreground font-display text-xs uppercase tracking-wider">Nome</span>
                                        )}
                                    </div>
                                </th>
                                {onSort ? (
                                    <SortableHeader label="Classificacao" column="classification" currentSort={sortBy} sortOrder={sortOrder} onSort={onSort} />
                                ) : (
                                    <th scope="col" className={HEADER_CLASS}>Classificacao</th>
                                )}
                                {onSort ? (
                                    <SortableHeader label="Temp." column="temperature" currentSort={sortBy} sortOrder={sortOrder} onSort={onSort} />
                                ) : (
                                    <th scope="col" className={HEADER_CLASS}>Temp.</th>
                                )}
                                {onSort ? (
                                    <SortableHeader label="Estagio" column="stage" currentSort={sortBy} sortOrder={sortOrder} onSort={onSort} />
                                ) : (
                                    <th scope="col" className={HEADER_CLASS}>Estagio</th>
                                )}
                                <th scope="col" className={HEADER_CLASS}>Contato</th>
                                {onSort ? (
                                    <SortableHeader label="Status" column="status" currentSort={sortBy} sortOrder={sortOrder} onSort={onSort} />
                                ) : (
                                    <th scope="col" className={HEADER_CLASS}>Status</th>
                                )}
                                {onSort ? (
                                    <SortableHeader label="Responsavel" column="owner_id" currentSort={sortBy} sortOrder={sortOrder} onSort={onSort} />
                                ) : (
                                    <th scope="col" className={HEADER_CLASS}>Responsavel</th>
                                )}
                                {onSort ? (
                                    <SortableHeader label="Origem" column="source" currentSort={sortBy} sortOrder={sortOrder} onSort={onSort} />
                                ) : (
                                    <th scope="col" className={HEADER_CLASS}>Origem</th>
                                )}
                                {/* Story 3.8 — Lead Score */}
                                {onSort ? (
                                    <SortableHeader label="Score" column="lead_score" currentSort={sortBy} sortOrder={sortOrder} onSort={onSort} />
                                ) : (
                                    <th scope="col" className={HEADER_CLASS}>Score</th>
                                )}
                                {onSort ? (
                                    <SortableHeader label="Criado" column="created_at" currentSort={sortBy} sortOrder={sortOrder} onSort={onSort} />
                                ) : (
                                    <th scope="col" className={HEADER_CLASS}>Criado</th>
                                )}
                                <th scope="col" className={HEADER_CLASS}><span className="sr-only">Acoes</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border dark:divide-white/5">
                            {filteredContacts.map((contact) => {
                                const isSelected = selectedIds.has(contact.id);
                                const stickyBg = isSelected ? STICKY_ROW_SELECTED_BG : STICKY_ROW_BG;
                                return (
                                <tr
                                    key={contact.id}
                                    onClick={(e) => {
                                        const target = e.target as HTMLElement;
                                        if (target.closest('input, button, select, a, [role="listbox"]')) return;
                                        openDetailModal ? openDetailModal(contact.id) : openEditModal(contact);
                                    }}
                                    className={`transition-colors group cursor-pointer ${isSelected ? 'bg-primary-50/50 dark:bg-primary-900/10' : 'bg-white dark:bg-card'} hover:bg-background dark:hover:bg-white/5`}
                                >
                                    <td className={`${STICKY_Z} ${stickyBg} min-w-[250px] px-4 py-4`}>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelect(contact.id)}
                                                aria-label={`Selecionar ${contact.name}`}
                                                className="rounded border-border text-primary-600 focus:ring-primary-500 dark:bg-white/5 flex-shrink-0"
                                            />
                                            <Button
                                                type="button"
                                                onClick={() => openDetailModal ? openDetailModal(contact.id) : openEditModal(contact)}
                                                className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 text-primary-700 dark:text-primary-200 flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white dark:ring-white/5 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-card flex-shrink-0"
                                                aria-label={`Ver detalhes: ${contact.name || 'Sem nome'}`}
                                                title={contact.name || 'Sem nome'}
                                            >
                                                {(contact.name || '?').charAt(0)}
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={() => openDetailModal ? openDetailModal(contact.id) : openEditModal(contact)}
                                                className="font-semibold text-foreground hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-left truncate"
                                            >
                                                {contact.name}
                                            </Button>
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
                                            <div className="flex items-center gap-2 text-secondary-foreground dark:text-muted-foreground text-xs">
                                                <Mail size={12} /> {contact.email || '---'}
                                            </div>
                                            <div className="flex items-center gap-2 text-secondary-foreground dark:text-muted-foreground text-xs">
                                                <Phone size={12} /> {contact.phone || '---'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <StatusDropdown
                                                status={contact.status}
                                                contactName={contact.name}
                                                onChange={(newStatus) => updateContact(contact.id, { status: newStatus })}
                                            />
                                            <Button
                                                onClick={() => convertContactToDeal(contact.id)}
                                                className="p-1 text-muted-foreground hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                                aria-label={`Criar oportunidade para ${contact.name}`}
                                            >
                                                <Plus size={14} aria-hidden="true" />
                                            </Button>
                                        </div>
                                    </td>
                                    {/* Story 3.5 — Responsavel */}
                                    <td className="px-6 py-4">
                                        {contact.ownerId && profilesMap.has(contact.ownerId) ? (
                                            <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-muted to-accent text-secondary-foreground dark:text-muted-foreground flex items-center justify-center text-2xs font-bold flex-shrink-0">
                                                    {(profilesMap.get(contact.ownerId)!.name || '?').charAt(0).toUpperCase()}
                                                </span>
                                                <span className="text-xs text-secondary-foreground dark:text-muted-foreground truncate max-w-[120px]">
                                                    {profilesMap.get(contact.ownerId)!.name}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">---</span>
                                        )}
                                    </td>
                                    {/* Story 3.5 — Origem */}
                                    <td className="px-6 py-4">
                                        <SourceBadge source={contact.source} />
                                    </td>
                                    {/* Story 3.8 — Lead Score */}
                                    <td className="px-6 py-4">
                                        <LeadScoreBadge score={contact.leadScore} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div
                                            className="flex items-center gap-2 text-secondary-foreground dark:text-muted-foreground text-xs"
                                            title={contact.createdAt ? PT_BR_DATE_TIME_FORMATTER.format(new Date(contact.createdAt)) : undefined}
                                        >
                                            <Calendar size={14} className="text-muted-foreground" />
                                            <span>{formatRelativeDate(contact.createdAt, now)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <Button
                                                onClick={() => openEditModal(contact)}
                                                className="p-1.5 text-muted-foreground hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                                aria-label={`Editar ${contact.name}`}
                                            >
                                                <Pencil size={16} aria-hidden="true" />
                                            </Button>
                                            <Button
                                                onClick={() => setDeleteId(contact.id)}
                                                className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-muted-foreground hover:text-red-500 transition-colors"
                                                aria-label={`Excluir ${contact.name}`}
                                            >
                                                <Trash2 size={16} aria-hidden="true" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
            </div>
        </div>
    );
};
