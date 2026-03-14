import React, { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { DealView, CustomFieldDefinition, BoardStage, DealSortableColumn } from '@/types';
import { ActivityStatusIcon } from './ActivityStatusIcon';
import { getActivityStatus } from '@/features/boards/hooks/boardUtils';
import { MoveToStageModal } from '../Modals/MoveToStageModal';
import { Button } from '@/components/ui/button';
import {
  Mail,
  Phone,
  Pencil,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Briefcase,
} from 'lucide-react';
import { useOrganizationMembers, OrgMember } from '@/hooks/useOrganizationMembers';
import ConfirmModal from '@/components/ConfirmModal';

type QuickAddType = 'CALL' | 'MEETING' | 'EMAIL' | 'WHATSAPP';

// Performance: reuse Intl formatters
const PT_BR_DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR');
const PT_BR_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatRelativeDate(dateString: string | undefined | null, now: Date): string {
  if (!dateString) return '---';
  const date = new Date(dateString);
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = today.getTime() - dateDay.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    if (absDays === 1) return 'Amanha';
    return `Em ${absDays} dias`;
  }
  if (diffDays < 7) return `Ha ${diffDays} dias`;
  if (diffDays < 30) return `Ha ${Math.floor(diffDays / 7)} sem.`;
  return PT_BR_DATE_FORMATTER.format(date);
}

function formatCurrency(value: number): string {
  return BRL_FORMATTER.format(value);
}

// ============================================
// SortableHeader (typed for DealSortableColumn)
// ============================================
interface SortableHeaderProps {
  label: string;
  column: DealSortableColumn;
  currentSort: DealSortableColumn;
  sortOrder: 'asc' | 'desc';
  onSort: (column: DealSortableColumn) => void;
  className?: string;
}

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

// ============================================
// KanbanListRow
// ============================================
type KanbanListRowProps = {
  deal: DealView;
  stageLabel: string;
  stages: BoardStage[];
  customFieldDefinitions: CustomFieldDefinition[];
  isMenuOpen: boolean;
  isSelected: boolean;
  now: Date;
  corretorName: string;
  corretorAvatar: string | null;
  onSelect: (dealId: string) => void;
  onToggleCheck: (dealId: string, event?: React.MouseEvent | { shiftKey: boolean }) => void;
  onToggleMenu: (e: React.MouseEvent, dealId: string) => void;
  onQuickAdd: (dealId: string, type: QuickAddType, dealTitle: string) => void;
  onCloseMenu: () => void;
  onMoveDealToStage?: (dealId: string, newStageId: string) => void;
  onDeleteDeal?: (dealId: string) => void;
};

const KanbanListRow = React.memo(function KanbanListRow({
  deal,
  stageLabel,
  stages,
  customFieldDefinitions,
  isMenuOpen,
  isSelected,
  now,
  corretorName,
  corretorAvatar,
  onSelect,
  onToggleCheck,
  onToggleMenu,
  onQuickAdd,
  onCloseMenu,
  onMoveDealToStage,
  onDeleteDeal,
}: KanbanListRowProps) {
  const [moveToStageOpen, setMoveToStageOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const stickyBg = isSelected ? STICKY_ROW_SELECTED_BG : STICKY_ROW_BG;

  const isOverdue = deal.nextActivity?.isOverdue;

  return (
    <>
      <tr
        onClick={() => onSelect(deal.id)}
        className={`transition-colors group cursor-pointer ${
          isSelected
            ? 'bg-primary-50/50 dark:bg-primary-900/10'
            : 'bg-white dark:bg-card'
        } hover:bg-background dark:hover:bg-white/5`}
      >
        {/* Col 1: Checkbox + Activity + Negocio (sticky) */}
        <td
          className={`${STICKY_Z} ${stickyBg} min-w-[280px] px-4 py-3`}
          style={{ boxShadow: 'var(--shadow-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onClick={(e) => {
                e.stopPropagation()
                onToggleCheck(deal.id, e)
              }}
              readOnly
              aria-label={`Selecionar ${deal.title}`}
              className="rounded border-border text-primary-600 focus:ring-primary-500 dark:bg-white/5 flex-shrink-0"
            />
            <ActivityStatusIcon
              status={getActivityStatus(deal)}
              type={deal.nextActivity?.type}
              dealId={deal.id}
              dealTitle={deal.title}
              isOpen={isMenuOpen}
              onToggle={(e) => onToggleMenu(e, deal.id)}
              onQuickAdd={(type) => onQuickAdd(deal.id, type, deal.title)}
              onRequestClose={onCloseMenu}
            />
            <div className="min-w-0 flex-1">
              <Button
                type="button"
                onClick={() => onSelect(deal.id)}
                className="font-bold text-foreground hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-left truncate block text-sm"
              >
                {deal.contactName || 'Sem contato'}
              </Button>
            </div>
          </div>
        </td>

        {/* Col 2: Contato (email + phone) */}
        <td className="px-6 py-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-secondary-foreground dark:text-muted-foreground text-xs">
              <Mail size={12} /> {deal.contactEmail || '---'}
            </div>
            <div className="flex items-center gap-2 text-secondary-foreground dark:text-muted-foreground text-xs">
              <Phone size={12} /> {deal.contactPhone || '---'}
            </div>
          </div>
        </td>

        {/* Col 3: Estagio */}
        <td className="px-6 py-3">
          {onMoveDealToStage ? (
            <Button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMoveToStageOpen(true);
              }}
              className={`text-xs font-bold px-2 py-1 rounded focus-visible-ring ${
                deal.isWon
                  ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
                  : deal.isLost
                    ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                    : 'bg-muted text-secondary-foreground dark:bg-card dark:text-muted-foreground hover:bg-accent dark:hover:bg-accent'
              }`}
              aria-label="Mover estagio"
              title="Mover estagio"
            >
              {stageLabel}
            </Button>
          ) : (
            <span
              className={`text-xs font-bold px-2 py-1 rounded ${
                deal.isWon
                  ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
                  : deal.isLost
                    ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                    : 'bg-muted text-secondary-foreground dark:bg-card dark:text-muted-foreground'
              }`}
            >
              {stageLabel}
            </span>
          )}
        </td>

        {/* Col 4: Valor */}
        <td className="px-6 py-3 font-mono text-secondary-foreground dark:text-muted-foreground text-sm">
          {formatCurrency(deal.value)}
        </td>

        {/* Col 5: Corretor */}
        <td className="px-6 py-3">
          {corretorName !== 'Não atribuído' ? (
            <div className="flex items-center gap-2">
              {corretorAvatar ? (
                <Image src={corretorAvatar} alt="" width={20} height={20} className="w-5 h-5 rounded-full" unoptimized />
              ) : (
                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-muted to-accent text-secondary-foreground dark:text-muted-foreground flex items-center justify-center text-2xs font-bold flex-shrink-0">
                  {corretorName.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-xs text-secondary-foreground dark:text-muted-foreground truncate max-w-[120px]">{corretorName}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Não atribuído</span>
          )}
        </td>

        {/* Col 6: Prox. Atividade */}
        <td className="px-6 py-3">
          {deal.nextActivity ? (
            <div
              className={`flex items-center gap-2 text-xs ${
                isOverdue
                  ? 'text-red-600 dark:text-red-400 font-semibold'
                  : 'text-secondary-foreground dark:text-muted-foreground'
              }`}
              title={deal.nextActivity.date ? PT_BR_DATE_TIME_FORMATTER.format(new Date(deal.nextActivity.date)) : undefined}
            >
              <Calendar size={14} className={isOverdue ?'text-red-500' : 'text-muted-foreground'} />
              <span>{formatRelativeDate(deal.nextActivity.date, now)}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">---</span>
          )}
        </td>

        {/* Col 7: Criado */}
        <td className="px-6 py-3">
          <div
            className="flex items-center gap-2 text-secondary-foreground dark:text-muted-foreground text-xs"
            title={deal.createdAt ? PT_BR_DATE_TIME_FORMATTER.format(new Date(deal.createdAt)) : undefined}
          >
            <Calendar size={14} className="text-muted-foreground" />
            <span>{formatRelativeDate(deal.createdAt, now)}</span>
          </div>
        </td>

        {/* Custom Fields */}
        {customFieldDefinitions.map((field) => (
          <td key={field.id} className="px-6 py-3 text-right text-secondary-foreground dark:text-muted-foreground text-sm">
            {String(deal.contactCustomFields?.[field.key] ?? '') || '-'}
          </td>
        ))}

        {/* Col: Acoes */}
        <td className="px-6 py-3 text-right">
          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(deal.id);
              }}
              className="p-1.5 text-muted-foreground hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
              aria-label={`Editar ${deal.title}`}
            >
              <Pencil size={16} aria-hidden="true" />
            </Button>
            {onDeleteDeal && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDeleteOpen(true);
                }}
                className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-muted-foreground hover:text-red-500 transition-colors"
                aria-label={`Excluir ${deal.title}`}
              >
                <Trash2 size={16} aria-hidden="true" />
              </Button>
            )}
          </div>
        </td>
      </tr>

      {onMoveDealToStage && moveToStageOpen ? (
        <MoveToStageModal
          isOpen={moveToStageOpen}
          onClose={() => setMoveToStageOpen(false)}
          onMove={(dealId, newStageId) => {
            onMoveDealToStage(dealId, newStageId);
            setMoveToStageOpen(false);
          }}
          deal={deal}
          stages={stages}
          currentStageId={deal.status}
        />
      ) : null}

      {onDeleteDeal && (
        <ConfirmModal
          isOpen={confirmDeleteOpen}
          onClose={() => setConfirmDeleteOpen(false)}
          onConfirm={() => {
            onDeleteDeal(deal.id);
            setConfirmDeleteOpen(false);
          }}
          title="Excluir negocio"
          message={`Tem certeza que deseja excluir "${deal.title}"? Esta acao nao pode ser desfeita.`}
          confirmText="Excluir"
          variant="danger"
        />
      )}
    </>
  );
});

// ============================================
// KanbanList
// ============================================
interface KanbanListProps {
  stages: BoardStage[];
  filteredDeals: DealView[];
  customFieldDefinitions: CustomFieldDefinition[];
  setSelectedDealId: (id: string | null) => void;
  openActivityMenuId: string | null;
  setOpenActivityMenuId: (id: string | null) => void;
  handleQuickAddActivity: (
    dealId: string,
    type: 'CALL' | 'MEETING' | 'EMAIL' | 'WHATSAPP',
    dealTitle: string
  ) => void;
  onMoveDealToStage?: (dealId: string, newStageId: string) => void;
  // New props
  selectedDealIds: Set<string>;
  toggleDealSelect: (dealId: string, event?: React.MouseEvent | { shiftKey: boolean }) => void;
  toggleDealSelectAll: () => void;
  sortBy: DealSortableColumn;
  sortOrder: 'asc' | 'desc';
  onSort: (column: DealSortableColumn) => void;
  totalCount: number;
  onDeleteDeal?: (dealId: string) => void;
}

export const KanbanList: React.FC<KanbanListProps> = ({
  stages,
  filteredDeals,
  customFieldDefinitions,
  setSelectedDealId,
  openActivityMenuId,
  setOpenActivityMenuId,
  handleQuickAddActivity,
  onMoveDealToStage,
  selectedDealIds,
  toggleDealSelect,
  toggleDealSelectAll,
  sortBy,
  sortOrder,
  onSort,
  totalCount,
  onDeleteDeal,
}) => {
  const { members } = useOrganizationMembers();

  const membersById = useMemo(() => {
    const map = new Map<string, OrgMember>();
    for (const m of members) map.set(m.id, m);
    return map;
  }, [members]);

  const stageLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stages) {
      if (s?.id) map.set(s.id, s.label);
    }
    return map;
  }, [stages]);

  const now = useMemo(() => new Date(), []);

  const allIds = useMemo(() => filteredDeals.map(d => d.id), [filteredDeals]);
  const allSelected = allIds.length > 0 && selectedDealIds.size === allIds.length;
  const someSelected = selectedDealIds.size > 0 && selectedDealIds.size < allIds.length;

  const handleRowClick = useCallback(
    (dealId: string) => setSelectedDealId(dealId),
    [setSelectedDealId]
  );

  const handleToggleMenu = useCallback(
    (e: React.MouseEvent, dealId: string) => {
      e.stopPropagation();
      setOpenActivityMenuId(openActivityMenuId === dealId ? null : dealId);
    },
    [openActivityMenuId, setOpenActivityMenuId]
  );

  const handleCloseMenu = useCallback(() => setOpenActivityMenuId(null), [setOpenActivityMenuId]);

  const handleQuickAdd = useCallback(
    (dealId: string, type: QuickAddType, dealTitle: string) => {
      handleQuickAddActivity(dealId, type, dealTitle);
    },
    [handleQuickAddActivity]
  );

  // Empty state
  if (filteredDeals.length === 0) {
    return (
      <div className="glass rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-muted dark:bg-white/5 flex items-center justify-center mb-4">
            <Briefcase size={24} className="text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-secondary-foreground dark:text-muted-foreground mb-1">
            Nenhum negocio encontrado
          </h3>
          <p className="text-xs text-muted-foreground dark:text-muted-foreground max-w-xs">
            Tente ajustar os filtros ou crie um novo negocio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full glass rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
      {/* Result count */}
      <div className="px-6 py-2 border-b border-border bg-background/50 dark:bg-white/[0.02]">
        <span className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
          {totalCount} negocio{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-background/80 dark:bg-white/5 border-b border-border sticky top-0 z-10 backdrop-blur-sm">
            <tr>
              {/* Sticky header: Checkbox + Negocio */}
              <th
                scope="col"
                className={`${STICKY_Z} ${STICKY_HEADER_BG} min-w-[280px] px-4 py-4`}
                style={{ boxShadow: 'var(--shadow-subtle)' }}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={() => toggleDealSelectAll()}
                    aria-label={allSelected ? 'Desmarcar todos os negocios' : 'Selecionar todos os negocios'}
                    className="rounded border-border text-primary-600 focus:ring-primary-500 dark:bg-white/5"
                  />
                  <Button
                    onClick={() => onSort('title')}
                    className="group inline-flex items-center gap-1.5 font-bold text-secondary-foreground dark:text-muted-foreground font-display text-xs uppercase tracking-wider hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    Contato
                    <span className={`transition-opacity ${sortBy === 'title' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                      {sortBy === 'title' ? (
                        sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                      ) : (
                        <ArrowUpDown size={14} />
                      )}
                    </span>
                  </Button>
                </div>
              </th>
              <th scope="col" className={HEADER_CLASS}>Contato</th>
              <SortableHeader label="Estagio" column="stageLabel" currentSort={sortBy} sortOrder={sortOrder} onSort={onSort} />
              <SortableHeader label="Valor" column="value" currentSort={sortBy} sortOrder={sortOrder} onSort={onSort} />
              <SortableHeader label="Corretor" column="owner" currentSort={sortBy} sortOrder={sortOrder} onSort={onSort} />
              <SortableHeader label="Prox. Atividade" column="nextActivity" currentSort={sortBy} sortOrder={sortOrder} onSort={onSort} />
              <SortableHeader label="Criado" column="createdAt" currentSort={sortBy} sortOrder={sortOrder} onSort={onSort} />
              {customFieldDefinitions.map(field => (
                <th
                  key={field.id}
                  className="px-6 py-4 font-bold text-xs text-muted-foreground dark:text-muted-foreground uppercase tracking-wider text-right"
                >
                  {field.label}
                </th>
              ))}
              <th scope="col" className={HEADER_CLASS}><span className="sr-only">Acoes</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-white/5">
            {filteredDeals.map((deal) => {
              const member = deal.ownerId ? membersById.get(deal.ownerId) : undefined;
              return (
              <KanbanListRow
                key={deal.id}
                deal={deal}
                stageLabel={stageLabelById.get(deal.status) || deal.status}
                stages={stages}
                customFieldDefinitions={customFieldDefinitions}
                isMenuOpen={openActivityMenuId === deal.id}
                isSelected={selectedDealIds.has(deal.id)}
                now={now}
                corretorName={member?.name || 'Não atribuído'}
                corretorAvatar={member?.avatar_url || null}
                onSelect={handleRowClick}
                onToggleCheck={toggleDealSelect}
                onToggleMenu={handleToggleMenu}
                onQuickAdd={handleQuickAdd}
                onCloseMenu={handleCloseMenu}
                onMoveDealToStage={onMoveDealToStage}
                onDeleteDeal={onDeleteDeal}
              />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
