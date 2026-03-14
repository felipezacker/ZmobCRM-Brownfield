import React from 'react';
import { Plus, Pencil, List, Users, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ContactList } from '@/types';

/** Sentinel values for special filter states */
export type ListFilterValue = string | null; // null = "Todas", '__no_list__' = "Sem Lista"
export const NO_LIST_FILTER = '__no_list__';

interface ContactListsSidebarProps {
  lists: ContactList[];
  selectedListId: ListFilterValue;
  onSelectList: (listId: ListFilterValue) => void;
  onCreateList: () => void;
  onEditList: (list: ContactList) => void;
  totalContactsCount: number;
  noListCount: number;
  isLoading?: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const ContactListsSidebar: React.FC<ContactListsSidebarProps> = ({
  lists,
  selectedListId,
  onSelectList,
  onCreateList,
  onEditList,
  totalContactsCount,
  noListCount,
  isLoading,
  collapsed,
  onToggleCollapse,
}) => {
  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 border-r border-border bg-background/50 dark:bg-white/[0.02] rounded-l-xl overflow-hidden transition-all duration-200 ${
        collapsed ? 'w-11' : 'w-48'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center border-b border-border shrink-0 ${collapsed ? 'justify-center py-2.5 px-1' : 'justify-between px-3 py-2.5'}`}>
        {!collapsed ? (
          <>
            <Button
              onClick={onToggleCollapse}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
              title="Recolher listas"
            >
              <PanelLeftClose size={15} />
            </Button>
            <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <List size={14} className="text-muted-foreground" />
              Listas
            </span>
            <Button
              onClick={onCreateList}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
              title="Nova Lista"
            >
              <Plus size={15} />
            </Button>
          </>
        ) : (
          <Button
            onClick={onToggleCollapse}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
            title="Expandir listas"
          >
            <PanelLeftOpen size={15} />
          </Button>
        )}
      </div>

      {/* Content — only when expanded */}
      {!collapsed && (
        <nav className="py-1 overflow-y-auto flex-1">
          <SidebarItem
            label="Todas"
            count={totalContactsCount}
            isActive={selectedListId === null}
            onClick={() => onSelectList(null)}
            icon={<Users size={14} />}
          />

          <SidebarItem
            label="Sem Lista"
            count={noListCount}
            isActive={selectedListId === NO_LIST_FILTER}
            onClick={() => onSelectList(NO_LIST_FILTER)}
            icon={<span className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-muted-foreground" />}
          />

          {lists.length > 0 && <div className="mx-3 my-1 border-t border-border" />}

          {isLoading && lists.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Carregando...</div>
          )}
          {lists.map(list => (
            <SidebarItem
              key={list.id}
              label={list.name}
              count={list.memberCount ?? 0}
              isActive={selectedListId === list.id}
              onClick={() => onSelectList(list.id)}
              icon={
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: list.color }}
                />
              }
              onEdit={() => onEditList(list)}
            />
          ))}
        </nav>
      )}
    </aside>
  );
};

/** Single sidebar item */
function SidebarItem({
  label,
  count,
  isActive,
  onClick,
  icon,
  onEdit,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  onEdit?: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm transition-colors ${
        isActive
          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
          : 'text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/5'
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    >
      {icon}
      <span className="truncate flex-1">{label}</span>
      <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
      {onEdit && (
        <Button
          onClick={e => { e.stopPropagation(); onEdit(); }}
          className="p-0.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
          title="Editar lista"
        >
          <Pencil size={12} />
        </Button>
      )}
    </div>
  );
}
