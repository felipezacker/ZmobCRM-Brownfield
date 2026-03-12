import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  Settings,
  BarChart3,
  Inbox,
  CheckSquare,
  PanelLeftClose,
  PanelLeftOpen,
  PhoneOutgoing
} from 'lucide-react';
import { prefetchRoute, RouteName } from '@/lib/prefetch';
import { Button } from '@/components/ui/button';
import { SidebarUserCard } from './SidebarUserCard';

const NAV_ITEMS: Array<{
  to: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  prefetch: RouteName;
}> = [
  { to: '/inbox', icon: Inbox, label: 'Inbox', prefetch: 'inbox' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Visao Geral', prefetch: 'dashboard' },
  { to: '/boards', icon: KanbanSquare, label: 'Boards', prefetch: 'boards' },
  { to: '/contacts', icon: Users, label: 'Contatos', prefetch: 'contacts' },
  { to: '/activities', icon: CheckSquare, label: 'Atividades', prefetch: 'activities' },
  { to: '/prospecting', icon: PhoneOutgoing, label: 'Prospeccao', prefetch: 'prospecting' },
  { to: '/reports', icon: BarChart3, label: 'Relatorios', prefetch: 'reports' },
  { to: '/settings', icon: Settings, label: 'Configuracoes', prefetch: 'settings' },
];

interface AppSidebarProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  clickedPath?: string;
  onItemClick: (path: string) => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  sidebarCollapsed,
  setSidebarCollapsed,
  clickedPath,
  onItemClick,
}) => {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);

  // Hover-to-expand: collapsed + hovered = temporarily show expanded content
  const isHoverExpanded = sidebarCollapsed && isHovered;
  const showExpanded = !sidebarCollapsed || isHoverExpanded;

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`hidden lg:flex fixed left-0 top-0 bottom-0 flex-col z-20 glass border-r border-[var(--color-border-subtle)] transition-all duration-300 ease-in-out
        ${showExpanded ? 'w-52' : 'w-20 items-center'}
        ${isHoverExpanded ? 'z-40 shadow-2xl shadow-black/20' : ''}
      `}
      aria-label="Menu principal"
    >
      {/* Logo */}
      <div className={`h-16 flex items-center border-b border-[var(--color-border-subtle)] transition-all duration-300 px-5 ${!showExpanded ? 'justify-center px-0' : ''}`}>
        <div className={`flex items-center transition-all duration-300 ${!showExpanded ? 'gap-0 justify-center' : 'gap-3'}`}>
          <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary-500/20 shrink-0" aria-hidden="true">
            Z
          </div>
          <span className={`text-xl font-bold font-display tracking-tight text-foreground whitespace-nowrap overflow-hidden transition-all duration-300 ${!showExpanded ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            ZmobCRM
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 space-y-1.5 flex flex-col transition-all duration-300 ${showExpanded ? 'p-4' : 'p-2 items-center'}`} aria-label="Navegacao do sistema">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.to || (item.to === '/boards' && pathname === '/pipeline');
          const wasJustClicked = clickedPath === item.to;
          const anotherItemWasClicked = clickedPath && clickedPath !== item.to;
          const isActuallyActive = anotherItemWasClicked ? false : (isActive || wasJustClicked);

          return (
            <Link
              key={item.to}
              href={item.to}
              onMouseEnter={() => prefetchRoute(item.prefetch)}
              onFocus={() => prefetchRoute(item.prefetch)}
              onClick={() => onItemClick(item.to)}
              className={`flex items-center rounded-lg text-sm font-medium transition-all duration-300 ease-in-out focus-visible-ring
                ${showExpanded ? 'gap-3 px-4 py-2.5' : 'p-2.5'}
                ${isActuallyActive
                  ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-900/50'
                  : 'text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/5 hover:text-foreground dark:hover:text-white'
                }`}
              title={item.label}
            >
              <item.icon size={20} className={`shrink-0 ${isActuallyActive ? 'text-primary-500' : ''}`} aria-hidden="true" />
              <span className={`font-display tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ${showExpanded ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Toggle / Pin Button */}
      <div className={`pb-2 transition-all duration-300 ${showExpanded ? 'px-4' : 'px-2 flex justify-center'}`}>
        <Button
          onClick={() => setSidebarCollapsed(showExpanded ? !sidebarCollapsed : false)}
          className={`flex items-center rounded-xl text-muted-foreground hover:text-secondary-foreground dark:hover:text-white transition-all duration-300 text-sm
            ${showExpanded
              ? 'gap-2 w-full px-3 py-2 bg-background/50 dark:bg-white/5 border border-border hover:bg-muted dark:hover:bg-white/10'
              : 'justify-center p-2.5 hover:bg-muted dark:hover:bg-white/5'
            }`}
          title={sidebarCollapsed ? (showExpanded ? 'Fixar Menu Aberto' : 'Expandir Menu') : 'Recolher Menu'}
        >
          {!sidebarCollapsed ? <PanelLeftClose size={18} className="shrink-0" /> : <PanelLeftOpen size={18} className="shrink-0" />}
          <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${showExpanded ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
            {sidebarCollapsed ? 'Fixar' : 'Recolher'}
          </span>
        </Button>
      </div>

      <SidebarUserCard collapsed={!showExpanded} />
    </aside>
  );
};
