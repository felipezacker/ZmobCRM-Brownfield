import React from 'react';
import { Loader2 } from 'lucide-react';
import { InstallProgress } from '@/features/boards/components/board-wizard/types';

interface InstallingOverlayProps {
  installProgress: InstallProgress | null;
}

export const InstallingOverlay: React.FC<InstallingOverlayProps> = ({ installProgress }) => {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <div
        className="relative z-10 w-[min(520px,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur p-5 shadow-2xl"
        aria-label={
          installProgress && installProgress.total === 1 ? 'Criando board' : 'Instalando funil'
        }
      >
        <div className="flex items-start gap-3">
          <Loader2 className="mt-0.5 animate-spin text-primary-500" size={22} />
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold text-slate-900 dark:text-white">
              {installProgress && installProgress.total === 1
                ? 'Criando board...'
                : 'Instalando funil...'}
            </div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {installProgress
                ? `Criando board ${installProgress.current}/${installProgress.total}${installProgress.currentBoardName ? ` — ${installProgress.currentBoardName}` : ''}`
                : 'Preparando...'}
            </div>
          </div>
        </div>
        {installProgress && installProgress.total > 0 && (
          <div className="mt-4">
            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-primary-500 transition-all"
                style={{
                  width: `${Math.min(100, Math.max(0, (installProgress.current / installProgress.total) * 100))}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
