import React from 'react';
import { Sparkles, Bug, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { NotificationPopover } from '@/components/notifications/NotificationPopover';
import { Button } from '@/components/ui/button';
import { RealtimeConnectionBadge } from '@/components/ui/RealtimeConnectionBadge';
import type { ConnectionStatus } from '@/lib/realtime';
import type { ThemeMode } from '@/context/ThemeContext';

const THEME_ICONS: Record<ThemeMode, React.ReactNode> = {
  system: <Monitor size={20} aria-hidden="true" />,
  light: <Sun size={20} aria-hidden="true" />,
  dark: <Moon size={20} aria-hidden="true" />,
};

interface AppHeaderProps {
  isGlobalAIOpen: boolean;
  onToggleAI: () => void;
  debugEnabled: boolean;
  onToggleDebug: () => void;
  connectionStatus: ConnectionStatus;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  isGlobalAIOpen,
  onToggleAI,
  debugEnabled,
  onToggleDebug,
  connectionStatus,
}) => {
  const { themeMode, cycleTheme, themeLabel } = useTheme();
  const { addToast } = useToast();

  const handleCycleTheme = () => {
    cycleTheme();
    // Toast shows the NEXT theme (what it will become after state update)
    const order: ThemeMode[] = ['system', 'light', 'dark'];
    const nextIdx = (order.indexOf(themeMode) + 1) % order.length;
    const nextMode = order[nextIdx];
    const labels: Record<ThemeMode, string> = {
      system: 'Tema do sistema',
      light: 'Tema claro',
      dark: 'Tema escuro',
    };
    addToast(labels[nextMode], 'info', { duration: 1500 });
  };

  return (
    <header className="h-16 glass border-b border-[var(--color-border-subtle)] flex items-center justify-end px-6 shrink-0" role="banner">
      <div className="flex items-center gap-4">
        <RealtimeConnectionBadge status={connectionStatus} />
        <Button
          type="button"
          onClick={onToggleAI}
          className={`p-2 rounded-full transition-all active:scale-95 focus-visible-ring ${isGlobalAIOpen
            ? 'text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/20'
            : 'text-muted-foreground hover:text-secondary-foreground dark:text-muted-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-white/10'
            }`}
        >
          <Sparkles size={20} aria-hidden="true" />
        </Button>

        <Button
          type="button"
          onClick={onToggleDebug}
          className={`p-2 rounded-full transition-all active:scale-95 focus-visible-ring ${debugEnabled
            ? 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30 ring-2 ring-purple-400/50'
            : 'text-muted-foreground hover:text-secondary-foreground dark:text-muted-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-white/10'
            }`}
        >
          <Bug size={20} aria-hidden="true" />
        </Button>

        <NotificationPopover />
        <Button
          type="button"
          onClick={handleCycleTheme}
          className="p-2 text-muted-foreground hover:text-secondary-foreground dark:text-muted-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-white/10 rounded-full transition-all active:scale-95 focus-visible-ring"
          title={themeLabel}
        >
          {THEME_ICONS[themeMode]}
        </Button>
      </div>
    </header>
  );
};
