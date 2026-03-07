import React from 'react';
import { LayoutTemplate } from 'lucide-react';
import { OFFICIAL_JOURNEYS } from '@/lib/templates/journey-templates';
import { JourneyDefinition } from '@/types';

interface PlaybookPreviewStepProps {
  selectedPlaybookId: string;
  includeSubscriptionRenewals: boolean;
  onToggleRenewals: (checked: boolean) => void;
  getJourneyForInstall: (id: string) => JourneyDefinition | null;
}

export const PlaybookPreviewStep: React.FC<PlaybookPreviewStepProps> = ({
  selectedPlaybookId,
  includeSubscriptionRenewals,
  onToggleRenewals,
  getJourneyForInstall,
}) => {
  const journey = OFFICIAL_JOURNEYS[selectedPlaybookId];
  if (!journey) return null;

  const boards =
    getJourneyForInstall(selectedPlaybookId)?.boards ?? journey.boards;

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-black/20 -m-6">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card border-b border-slate-200 dark:border-white/10 py-5 px-8 shrink-0">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-500/20 shrink-0">
            <LayoutTemplate className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              {journey.name}
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wide border border-slate-200 dark:border-white/10">
                Playbook Oficial
              </span>
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
              {journey.description}
            </p>
          </div>
        </div>
      </div>

      {/* Journey Timeline */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px flex-1 bg-slate-300 dark:bg-white/10" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Jornada do Cliente ({boards.length} Etapas)
            </span>
            <div className="h-px flex-1 bg-slate-300 dark:bg-white/10" />
          </div>

          {/* Optional renewals checkbox (Infoproducer only) */}
          {selectedPlaybookId === 'INFOPRODUCER' && (
            <div className="mb-6 p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-card">
              <div className="flex items-start gap-3">
                <input
                  id="include-renewals"
                  type="checkbox"
                  checked={includeSubscriptionRenewals}
                  onChange={(e) => onToggleRenewals(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <div className="flex-1">
                  <label
                    htmlFor="include-renewals"
                    className="font-semibold text-slate-900 dark:text-white"
                  >
                    Incluir Renovacoes (Assinatura)
                  </label>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Adiciona um board opcional para controlar renovacoes com antecedencia
                    (180/120/90/60/30 dias).
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-8 relative">
            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-slate-200 dark:bg-white/10" />

            {boards.map((board, index) => (
              <div key={index} className="relative pl-20 group">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white dark:bg-dark-card border-2 border-slate-200 dark:border-white/10 flex items-center justify-center text-lg font-bold text-slate-400 shadow-sm z-10 group-hover:border-primary-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 group-hover:scale-110 transition-all duration-300">
                  {index + 1}
                </div>

                <div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-primary-500/30 group-hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                      {board.name}
                    </h4>
                    <div className="flex gap-2">
                      {index === 0 && (
                        <span className="px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold uppercase tracking-wide">
                          Inicio
                        </span>
                      )}
                      {index === boards.length - 1 && (
                        <span className="px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[10px] font-bold uppercase tracking-wide">
                          Fim
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                      Etapas do Funil
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {board.columns.map((column, i) => (
                        <div key={i} className="flex items-center group/tag">
                          <span className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-white/5 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-white/5 group-hover/tag:border-primary-200 dark:group-hover/tag:border-primary-500/30 group-hover/tag:bg-primary-50 dark:group-hover/tag:bg-primary-900/20 transition-colors">
                            {column.name}
                          </span>
                          {i < board.columns.length - 1 && (
                            <span className="mx-2 text-slate-300 dark:text-slate-600">
                              &rarr;
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
