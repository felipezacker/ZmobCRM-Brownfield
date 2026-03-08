import React from 'react';
import { Loader2 } from 'lucide-react';
import { BOARD_TEMPLATES, BoardTemplateType } from '@/lib/templates/board-templates';
import { OFFICIAL_JOURNEYS } from '@/lib/templates/journey-templates';
import { RegistryIndex } from '@/types';
import { Button } from '@/components/ui/button';

export function PlaybooksList({ onSelectPlaybook }: { onSelectPlaybook: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-2 text-center">
        <span className="text-yellow-500">&#11088;</span> Playbooks (Jornadas)
      </h3>
      <div className="flex flex-col gap-3">
        {OFFICIAL_JOURNEYS &&
          Object.values(OFFICIAL_JOURNEYS).map((journey) => (
            <Button
              key={journey.id}
              onClick={() => onSelectPlaybook(journey.id)}
              className="group relative w-full text-left overflow-hidden rounded-xl border border-border bg-white dark:bg-dark-card hover:border-primary-500/50 dark:hover:border-primary-500/50 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary-50/50 to-transparent dark:from-primary-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative p-4 flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center bg-primary-50 dark:bg-primary-900/20 rounded-lg text-xl shrink-0 group-hover:scale-110 transition-transform duration-300">
                  {journey.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-foreground text-sm truncate group-hover:text-primary-600 dark:group-hover:text-primary-400">
                    {journey.name}
                  </h4>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground line-clamp-2 mt-0.5">
                    {journey.description}
                  </p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 text-xs">
                    &rarr;
                  </div>
                </div>
              </div>
            </Button>
          ))}
      </div>
    </div>
  );
}

export function TemplatesList({ onSelectTemplate }: { onSelectTemplate: (k: BoardTemplateType) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">
        Boards Individuais
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(Object.keys(BOARD_TEMPLATES) as BoardTemplateType[])
          .filter((key) => key !== 'CUSTOM')
          .map((key) => {
            const t = BOARD_TEMPLATES[key];
            return (
              <Button
                key={key}
                onClick={() => onSelectTemplate(key)}
                className="p-4 bg-white dark:bg-dark-card border border-border rounded-xl hover:border-primary-500/50 dark:hover:border-primary-500/50 hover:shadow-md transition-all text-left group flex flex-col h-full min-h-[140px]"
              >
                <div className="flex items-center gap-3 mb-3 shrink-0">
                  <span className="text-2xl group-hover:scale-110 transition-transform duration-200">{t.emoji}</span>
                  <h4 className="font-semibold text-foreground text-base group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                    {t.name}
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground leading-relaxed line-clamp-3 flex-1">{t.description}</p>
                <div className="mt-3 pt-3 border-t border-border flex gap-2 shrink-0 overflow-hidden">
                  {t.tags.slice(0, 2).map((tag, i) => (
                    <span key={`${key}-tag-${i}`} className="px-2 py-1 rounded-md bg-background dark:bg-white/5 text-[10px] font-medium text-muted-foreground dark:text-muted-foreground border border-border whitespace-nowrap">
                      #{tag}
                    </span>
                  ))}
                </div>
              </Button>
            );
          })}
      </div>
    </div>
  );
}

export function CommunityList({
  registryIndex, isLoadingRegistry, isInstalling, onInstallJourney,
}: {
  registryIndex: RegistryIndex | null; isLoadingRegistry: boolean;
  isInstalling: boolean; onInstallJourney: (path: string) => void;
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground mb-4">Templates da Comunidade</h3>
      {isLoadingRegistry ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-primary-500" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 mb-6">
          {registryIndex?.templates.map((tpl) => (
            <Button
              key={tpl.id}
              onClick={() => onInstallJourney(tpl.path)}
              disabled={isInstalling}
              className="p-4 border-2 border-border rounded-xl hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all text-left group disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400 flex items-center gap-2">
                  {tpl.name}
                  <span className="text-xs bg-muted dark:bg-white/10 px-2 py-0.5 rounded-full text-muted-foreground">v{tpl.version}</span>
                </h4>
                {isInstalling && <Loader2 className="animate-spin text-primary-500" size={16} />}
              </div>
              <p className="text-sm text-secondary-foreground dark:text-muted-foreground mb-2">{tpl.description}</p>
              <div className="flex gap-2 flex-wrap">
                {tpl.tags.map((tag, i) => (
                  <span key={`${tpl.id}-tag-${i}`} className="px-2 py-1 rounded-md bg-white dark:bg-black/20 text-xs text-muted-foreground dark:text-muted-foreground border border-border">#{tag}</span>
                ))}
                <span className="text-xs text-muted-foreground ml-auto">por {tpl.author}</span>
              </div>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
