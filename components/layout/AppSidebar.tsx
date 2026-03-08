import React from 'react';
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
import { NavItem } from './NavItem';
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

  return (
    <aside
      className={`hidden lg:flex flex-col z-20 glass border-r border-[var(--color-border-subtle)] transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-20 items-center' : 'w-52'}`}
      aria-label="Menu principal"
    >
      {/* Logo */}
      <div className={`h-16 flex items-center border-b border-[var(--color-border-subtle)] transition-all duration-300 px-5 ${sidebarCollapsed ? 'justify-center px-0' : ''}`}>
        <div className={`flex items-center transition-all duration-300 ${sidebarCollapsed ? 'gap-0 justify-center' : 'gap-3'}`}>
          <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary-500/20 shrink-0" aria-hidden="true">
            Z
          </div>
          <span className={`text-xl font-bold font-display tracking-tight text-foreground whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            ZmobCRM
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 p-4 space-y-2 flex flex-col ${sidebarCollapsed ? 'items-center px-2' : ''}`} aria-label="Navegacao do sistema">
        {NAV_ITEMS.map((item) => {
          if (sidebarCollapsed) {
            const isActive = pathname === item.to || (item.to === '/boards' && pathname === '/pipeline');
            const wasJustClicked = clickedPath === item.to;
            const anotherItemWasClicked = clickedPath && clickedPath !== item.to;
            const isActuallyActive = anotherItemWasClicked ? false : (isActive || wasJustClicked);
            return (
              <Link
                key={item.to}
                href={item.to}
                onMouseEnter={() => prefetchRoute(item.prefetch)}
                onClick={() => onItemClick(item.to)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActuallyActive
                  ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-900/50'
                  : 'text-muted-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/5 hover:text-foreground dark:hover:text-white'
                  }`}
                title={item.label}
              >
                <item.icon size={20} />
              </Link>
            );
          }

          return (
            <NavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              prefetch={item.prefetch}
              clickedPath={clickedPath}
              onItemClick={onItemClick}
            />
          );
        })}
      </nav>

      {/* Toggle Button */}
      {!sidebarCollapsed ? (
        <div className="px-4 pb-2">
          <Button
            onClick={() => setSidebarCollapsed(true)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-muted-foreground hover:text-secondary-foreground dark:hover:text-white bg-background/50 dark:bg-white/5 border border-border hover:bg-muted dark:hover:bg-white/10 transition-all text-sm"
            title="Recolher Menu"
          >
            <PanelLeftClose size={18} />
            <span>Recolher</span>
          </Button>
        </div>
      ) : (
        <div className="px-4 pb-2 flex justify-center">
          <Button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex items-center justify-center w-10 h-10 p-2 rounded-lg text-muted-foreground hover:text-secondary-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-white/5 transition-all"
            title="Expandir Menu"
          >
            <PanelLeftOpen size={20} />
          </Button>
        </div>
      )}

      <SidebarUserCard collapsed={sidebarCollapsed} />
    </aside>
  );
};
