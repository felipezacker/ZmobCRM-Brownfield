'use client';

import React from 'react';
import { Download, X } from 'lucide-react';
import { useInstallState } from './useInstallState';
import { Button } from '@/components/ui/button';

export function InstallBanner() {
  const { isEligible, isDismissed, canPrompt, platformHint, promptInstall, dismiss } = useInstallState();

  if (!isEligible || isDismissed) return null;

  return (
    <div className="fixed left-3 right-3 top-3 z-[var(--z-toast)] md:left-[calc(0.75rem+var(--app-sidebar-width,0px))] md:right-3">
      <div className="glass border border-border rounded-2xl px-4 py-3 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-9 w-9 rounded-xl bg-primary-500/10 flex items-center justify-center shrink-0">
            <Download className="h-5 w-5 text-primary-600 dark:text-primary-400" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">
              Instale o ZmobCRM
            </div>
            <div className="text-xs text-secondary-foreground dark:text-muted-foreground mt-0.5">
              {platformHint === 'ios'
                ? 'No iPhone/iPad: toque em Compartilhar → “Adicionar à Tela de Início”.'
                : canPrompt
                  ? 'Instale para abrir mais rápido e usar como app.'
                  : 'Instale para abrir mais rápido e usar como app.'}
            </div>
            {platformHint !== 'ios' ? (
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  onClick={promptInstall}
                  disabled={!canPrompt}
                  className="px-3 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:bg-accent disabled:text-secondary-foreground text-white text-xs font-semibold transition-colors"
                >
                  Instalar
                </Button>
                <Button
                  type="button"
                  onClick={dismiss}
                  className="px-3 py-2 rounded-xl bg-muted dark:bg-white/5 text-secondary-foreground dark:text-muted-foreground text-xs font-semibold hover:bg-accent dark:hover:bg-white/10 transition-colors"
                >
                  Agora não
                </Button>
              </div>
            ) : (
              <div className="mt-2">
                <Button
                  type="button"
                  onClick={dismiss}
                  className="px-3 py-2 rounded-xl bg-muted dark:bg-white/5 text-secondary-foreground dark:text-muted-foreground text-xs font-semibold hover:bg-accent dark:hover:bg-white/10 transition-colors"
                >
                  Entendi
                </Button>
              </div>
            )}
          </div>
          <Button
            type="button"
            onClick={dismiss}
            className="p-2 rounded-lg hover:bg-muted dark:hover:bg-white/5 transition-colors focus-visible-ring"
            aria-label="Fechar"
          >
            <X className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

