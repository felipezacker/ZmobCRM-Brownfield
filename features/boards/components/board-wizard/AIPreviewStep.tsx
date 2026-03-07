import React from 'react';
import { Sparkles } from 'lucide-react';
import { GeneratedBoard } from '@/lib/ai/tasksClient';

interface AIPreviewStepProps {
  displayBoard: GeneratedBoard;
  isChatMode: boolean;
  isPreview: boolean;
}

export const AIPreviewStep: React.FC<AIPreviewStepProps> = ({
  displayBoard,
  isChatMode,
  isPreview,
}) => {
  return (
    <div className="space-y-6">
      {!isChatMode && (
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={20} className="text-green-600 dark:text-green-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Board Sugerido pela IA
          </h3>
        </div>
      )}

      {isPreview && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/20 p-3 rounded-lg mb-4 flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <span className="text-sm font-medium">Visualizando Sugestao (Nao salvo)</span>
        </div>
      )}

      <div
        className={`p-4 rounded-xl border ${
          isChatMode
            ? 'bg-white dark:bg-dark-card border-slate-200 dark:border-white/10 shadow-sm'
            : 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-500/20'
        }`}
      >
        <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {displayBoard.boardName}
        </h4>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          {displayBoard.description}
        </p>

        <div className="space-y-2">
          {displayBoard.stages.map((stage, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 bg-white dark:bg-dark-card rounded-lg border border-slate-100 dark:border-white/5"
            >
              <span className="text-lg font-semibold text-slate-400 w-6">{idx + 1}</span>
              <div className={`w-3 h-3 rounded-full shrink-0 ${stage.color}`} />
              <div className="flex-1">
                <h5 className="font-semibold text-slate-900 dark:text-white">{stage.name}</h5>
                <p className="text-xs text-slate-500 dark:text-slate-400">{stage.description}</p>
              </div>
              {stage.estimatedDuration && (
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {stage.estimatedDuration}
                </span>
              )}
            </div>
          ))}
        </div>

        {displayBoard.automationSuggestions &&
          displayBoard.automationSuggestions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Automacoes sugeridas:
              </p>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                {displayBoard.automationSuggestions.map((suggestion, idx) => (
                  <li key={idx}>&rarr; {suggestion}</li>
                ))}
              </ul>
            </div>
          )}
      </div>
    </div>
  );
};
