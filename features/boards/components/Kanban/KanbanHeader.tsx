import React, { useState } from 'react';
import { Plus, Search, LayoutGrid, Table as TableIcon, User, Settings, Lightbulb, Download, Filter, X, CalendarDays, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Board } from '@/types';
import { BoardSelector } from '../BoardSelector';
import { Button } from '@/components/ui/button';
import type { OrgMember } from '@/hooks/useOrganizationMembers';

interface KanbanHeaderProps {
    // Boards
    boards: Board[];
    activeBoard: Board;
    onSelectBoard: (id: string) => void;
    onCreateBoard: () => void;
    onEditBoard?: (board: Board) => void;
    onDeleteBoard?: (id: string) => void;
    onExportTemplates?: () => void;
    // View
    viewMode: 'kanban' | 'list';
    setViewMode: (mode: 'kanban' | 'list') => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    ownerFilter: string;
    setOwnerFilter: (filter: string) => void;
    statusFilter: 'open' | 'won' | 'lost' | 'all';
    setStatusFilter: (filter: 'open' | 'won' | 'lost' | 'all') => void;
    priorityFilter: 'all' | 'high' | 'medium' | 'low';
    setPriorityFilter: (filter: 'all' | 'high' | 'medium' | 'low') => void;
    dateRange: { start: string; end: string };
    setDateRange: (range: { start: string; end: string }) => void;
    orgMembers: OrgMember[];
    onNewDeal: () => void;
    // Advanced filters (BUX-7)
    activeAdvancedFilterCount: number;
    onOpenAdvancedFilters: () => void;
}

export const KanbanHeader: React.FC<KanbanHeaderProps> = ({
    boards,
    activeBoard,
    onSelectBoard,
    onCreateBoard,
    onEditBoard,
    onDeleteBoard,
    onExportTemplates,
    viewMode, setViewMode,
    searchTerm, setSearchTerm,
    ownerFilter, setOwnerFilter,
    statusFilter, setStatusFilter,
    priorityFilter, setPriorityFilter,
    dateRange, setDateRange,
    orgMembers,
    onNewDeal,
    activeAdvancedFilterCount,
    onOpenAdvancedFilters,
}) => {
    const [ownerOpen, setOwnerOpen] = useState(false);
    const [ownerSearch, setOwnerSearch] = useState('');

    const filteredOrgMembers = orgMembers.filter(
        m => !ownerSearch || m.name.toLowerCase().includes(ownerSearch.toLowerCase())
    );

    const ownerDisplayName = ownerFilter === 'all'
        ? 'Todos os Donos'
        : ownerFilter === 'mine'
            ? 'Meus Negócios'
            : orgMembers.find(m => m.id === ownerFilter)?.name || 'Dono';

    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                {/* Board Selector */}
                <BoardSelector
                    boards={boards}
                    activeBoard={activeBoard}
                    onSelectBoard={onSelectBoard}
                    onCreateBoard={onCreateBoard}
                    onEditBoard={onEditBoard}
                    onDeleteBoard={onDeleteBoard}
                />

                {/* Edit Board Button */}
                {onEditBoard && (
                    <Button
                        onClick={() => onEditBoard(activeBoard)}
                        className="p-2 text-muted-foreground hover:text-secondary-foreground dark:text-muted-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-white/5 rounded-lg transition-colors"
                        title="Configurações do Board"
                    >
                        <Settings size={20} />
                    </Button>
                )}

                {/* Export Template Button */}
                {onExportTemplates && (
                    <Button
                        onClick={onExportTemplates}
                        className="p-2 text-muted-foreground hover:text-secondary-foreground dark:text-muted-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-white/5 rounded-lg transition-colors"
                        title="Exportar template (comunidade)"
                    >
                        <Download size={20} />
                    </Button>
                )}

                {/* Automation Guide Button */}
                {activeBoard.automationSuggestions && activeBoard.automationSuggestions.length > 0 && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                className="p-2 text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors relative group"
                                title="Automações Sugeridas"
                            >
                                <Lightbulb size={20} className="fill-current" />
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="start">
                            <div className="p-4 border-b border-border bg-background dark:bg-card/50">
                                <h4 className="font-semibold text-foreground flex items-center gap-2">
                                    <Lightbulb size={16} className="text-yellow-500" />
                                    Automações Sugeridas
                                </h4>
                                <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                                    Dicas da IA para otimizar este processo.
                                </p>
                            </div>
                            <div className="p-2">
                                <ul className="space-y-1">
                                    {activeBoard.automationSuggestions.map((suggestion, idx) => (
                                        <li key={idx} className="text-sm text-secondary-foreground dark:text-muted-foreground p-2 hover:bg-background dark:hover:bg-white/5 rounded-md flex gap-2 items-start">
                                            <span className="text-muted-foreground mt-0.5">•</span>
                                            <span>{suggestion}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </PopoverContent>
                    </Popover>
                )}

                {/* VIEW TOGGLE */}
                <div className="flex bg-muted dark:bg-white/5 p-1 rounded-lg border border-border">
                    <Button
                        onClick={() => setViewMode('kanban')}
                        aria-label="Visualização em quadro Kanban"
                        aria-pressed={viewMode === 'kanban'}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-accent shadow-sm text-primary-600 ' : 'text-muted-foreground hover:text-secondary-foreground dark:text-muted-foreground'}`}
                    >
                        <LayoutGrid size={16} aria-hidden="true" />
                    </Button>
                    <Button
                        onClick={() => setViewMode('list')}
                        aria-label="Visualização em lista"
                        aria-pressed={viewMode === 'list'}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-accent shadow-sm text-primary-600 ' : 'text-muted-foreground hover:text-secondary-foreground dark:text-muted-foreground'}`}
                    >
                        <TableIcon size={16} aria-hidden="true" />
                    </Button>
                </div>

                <div className="h-8 w-px bg-accent dark:bg-white/10 mx-2 hidden sm:block"></div>
                <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input
                        type="text"
                        placeholder="Filtrar por nome, telefone, imóvel..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-border dark:border-border bg-white/50 dark:bg-white/5 text-sm outline-none focus:ring-2 focus:ring-primary-500 backdrop-blur-sm"
                    />
                </div>
                <div className="relative">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as 'open' | 'won' | 'lost' | 'all')}
                        aria-label="Filtrar por status"
                        className="pl-3 pr-8 py-2 rounded-lg border border-border dark:border-border bg-white/50 dark:bg-white/5 text-sm outline-none focus:ring-2 focus:ring-primary-500 backdrop-blur-sm appearance-none cursor-pointer"
                    >
                        <option value="open">Em Aberto</option>
                        <option value="won">Ganhos</option>
                        <option value="lost">Perdidos</option>
                        <option value="all">Todos</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <div className={`w-2 h-2 rounded-full ${statusFilter === 'open' ? 'bg-blue-500' :
                            statusFilter === 'won' ? 'bg-green-500' :
                                statusFilter === 'lost' ? 'bg-red-500' : 'bg-accent'
                            }`} />
                    </div>
                </div>

                {/* Priority Filter Chips */}
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Prioridade:</span>
                    <div className="flex bg-muted dark:bg-white/5 p-0.5 rounded-lg border border-border gap-0.5">
                        {(['all', 'high', 'medium', 'low'] as const).map(p => (
                            <Button key={p} onClick={() => setPriorityFilter(p)}
                                aria-label={`Filtrar prioridade: ${p === 'all' ? 'todas' : p === 'high' ? 'alta' : p === 'medium' ? 'média' : 'baixa'}`}
                                aria-pressed={priorityFilter === p}
                                className={`px-2 py-1 text-xs rounded-md transition-all ${priorityFilter === p ? 'bg-white dark:bg-accent shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>
                                {p === 'all' ? 'Todas' : p === 'high' ? 'Alta' : p === 'medium' ? 'Média' : 'Baixa'}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Owner Filter - Searchable Popover */}
                <Popover open={ownerOpen} onOpenChange={(open) => { setOwnerOpen(open); if (!open) setOwnerSearch(''); }}>
                    <PopoverTrigger asChild>
                        <Button
                            aria-label="Filtrar negócios por proprietário"
                            className="pl-3 pr-2 py-2 rounded-lg border border-border bg-white/50 dark:bg-white/5 text-sm outline-none focus:ring-2 focus:ring-primary-500 backdrop-blur-sm cursor-pointer flex items-center gap-1.5 min-w-[140px]"
                        >
                            <User size={14} className="text-muted-foreground shrink-0" />
                            <span className="truncate flex-1 text-left">{ownerDisplayName}</span>
                            <ChevronDown size={12} className="text-muted-foreground shrink-0" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-0" align="start">
                        <div className="p-2 border-b border-border">
                            <input
                                type="text"
                                placeholder="Buscar dono..."
                                value={ownerSearch}
                                onChange={(e) => setOwnerSearch(e.target.value)}
                                className="w-full px-2 py-1.5 text-sm rounded border border-border bg-white/50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-primary-500"
                                autoFocus
                            />
                        </div>
                        <div className="max-h-48 overflow-y-auto p-1">
                            <Button
                                type="button"
                                onClick={() => { setOwnerFilter('all'); setOwnerOpen(false); }}
                                className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-muted transition-colors ${ownerFilter === 'all' ? 'font-semibold bg-muted' : ''}`}
                            >
                                Todos os Donos
                            </Button>
                            <Button
                                type="button"
                                onClick={() => { setOwnerFilter('mine'); setOwnerOpen(false); }}
                                className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-muted transition-colors ${ownerFilter === 'mine' ? 'font-semibold bg-muted' : ''}`}
                            >
                                Meus Negócios
                            </Button>
                            {filteredOrgMembers.length > 0 && <div className="h-px bg-border my-1" />}
                            {filteredOrgMembers.map(m => (
                                <Button
                                    key={m.id}
                                    type="button"
                                    onClick={() => { setOwnerFilter(m.id); setOwnerOpen(false); }}
                                    className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-muted transition-colors ${ownerFilter === m.id ? 'font-semibold bg-muted' : ''}`}
                                >
                                    {m.name}
                                </Button>
                            ))}
                            {filteredOrgMembers.length === 0 && ownerSearch && (
                                <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum resultado</p>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Date Range Picker - Improved */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            aria-label="Filtrar por período"
                            className={`px-3 py-2 rounded-lg border border-border bg-white/50 dark:bg-white/5 text-sm outline-none focus:ring-2 focus:ring-primary-500 backdrop-blur-sm cursor-pointer flex items-center gap-1.5 ${(dateRange.start || dateRange.end) ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                        >
                            <CalendarDays size={14} className="shrink-0" />
                            <span className="truncate">
                                {dateRange.start || dateRange.end
                                    ? `${dateRange.start ? new Date(dateRange.start + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '...'} — ${dateRange.end ? new Date(dateRange.end + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '...'}`
                                    : 'Período'}
                            </span>
                            {(dateRange.start || dateRange.end) && (
                                <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => { e.stopPropagation(); setDateRange({ start: '', end: '' }); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setDateRange({ start: '', end: '' }); } }}
                                    className="ml-0.5 hover:text-foreground rounded-full hover:bg-muted p-0.5"
                                    aria-label="Limpar período"
                                >
                                    <X size={12} />
                                </span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                        <div className="p-2 grid grid-cols-2 gap-1 border-b border-border">
                            {[
                                { label: '7 dias', days: 7 },
                                { label: '30 dias', days: 30 },
                                { label: '90 dias', days: 90 },
                                { label: 'Este mês', days: -1 },
                            ].map(preset => {
                                const getPresetRange = () => {
                                    const end = new Date();
                                    const start = preset.days === -1
                                        ? new Date(end.getFullYear(), end.getMonth(), 1)
                                        : new Date(Date.now() - preset.days * 86400000);
                                    return {
                                        start: start.toISOString().split('T')[0],
                                        end: end.toISOString().split('T')[0],
                                    };
                                };
                                return (
                                    <Button
                                        key={preset.label}
                                        type="button"
                                        onClick={() => setDateRange(getPresetRange())}
                                        className="px-2 py-1.5 text-xs rounded bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {preset.label}
                                    </Button>
                                );
                            })}
                        </div>
                        <div className="p-3 space-y-2">
                            <div>
                                <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-0.5">De</label>
                                <input type="date" value={dateRange.start}
                                    onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-border bg-white/50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-primary-500" />
                            </div>
                            <div>
                                <label className="text-[10px] text-muted-foreground uppercase font-bold block mb-0.5">Até</label>
                                <input type="date" value={dateRange.end}
                                    onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-border bg-white/50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-primary-500" />
                            </div>
                            {(dateRange.start || dateRange.end) && (
                                <Button
                                    type="button"
                                    onClick={() => setDateRange({ start: '', end: '' })}
                                    className="w-full text-center text-xs text-red-500 hover:text-red-600 py-1 transition-colors"
                                >
                                    Limpar período
                                </Button>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Advanced Filters Button (BUX-7) */}
                <Button
                    onClick={onOpenAdvancedFilters}
                    aria-label="Abrir filtros avançados"
                    className="px-3 py-2 text-sm rounded-lg border border-border bg-white/50 dark:bg-white/5 text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-white/10 transition-colors flex items-center gap-1.5"
                >
                    <Filter size={16} />
                    Filtros
                    {activeAdvancedFilterCount > 0 && (
                        <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-primary-500 text-white rounded-full leading-none">
                            {activeAdvancedFilterCount}
                        </span>
                    )}
                </Button>
            </div>

            <div className="flex gap-3">
                <Button
                    onClick={onNewDeal}
                    className="bg-primary-700 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-lg shadow-primary-700/20"
                >
                    <Plus size={18} aria-hidden="true" /> Novo Negócio
                </Button>
            </div>
        </div>
    );
};
