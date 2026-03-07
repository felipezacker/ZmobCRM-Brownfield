import React from 'react';
import { BrainCircuit, Mail, Sword, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DealDetailAIInsightsProps } from '@/features/boards/components/deal-detail/types';

export const DealDetailAIInsights: React.FC<DealDetailAIInsightsProps> = ({
  dealBoard,
  isAnalyzing,
  isDrafting,
  aiResult,
  emailDraft,
  objection,
  objectionResponses,
  isGeneratingObjections,
  onAnalyze,
  onDraftEmail,
  onObjectionChange,
  onGenerateObjections,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-linear-to-br from-primary-50 to-white dark:from-primary-900/10 dark:to-dark-card p-6 rounded-xl border border-primary-100 dark:border-primary-500/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-100 dark:bg-primary-500/20 rounded-lg text-primary-600 dark:text-primary-400">
            <BrainCircuit size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white font-display text-lg">
              IA Insights
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Inteligencia Artificial aplicada ao negocio
            </p>
          </div>
        </div>

        {/* STRATEGY CONTEXT BAR */}
        {dealBoard?.agentPersona && (
          <div className="mb-6 bg-slate-900/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Bot size={20} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded">
                  Atuando como
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {dealBoard.agentPersona?.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {dealBoard.agentPersona?.role} - Foco: {dealBoard.goal?.kpi || 'Geral'}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3 mb-5">
          <Button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="flex-1 py-2.5 bg-white dark:bg-white/5 text-slate-700 dark:text-white text-sm font-medium rounded-lg shadow-sm border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <BrainCircuit size={16} />
            )}
            Analisar Negocio
          </Button>
          <Button
            onClick={onDraftEmail}
            disabled={isDrafting}
            className="flex-1 py-2.5 bg-white dark:bg-white/5 text-slate-700 dark:text-white text-sm font-medium rounded-lg shadow-sm border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2"
          >
            {isDrafting ? (
              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Mail size={16} />
            )}
            Escrever Email
          </Button>
        </div>

        {aiResult && (
          <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md p-4 rounded-lg border border-primary-100 dark:border-primary-500/20 mb-4">
            <div className="flex justify-between mb-2 border-b border-primary-100 dark:border-white/5 pb-2">
              <span className="text-xs font-bold text-primary-700 dark:text-primary-300 uppercase tracking-wider">
                Sugestao
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-2 rounded">
                {aiResult.score}% Chance
              </span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              {aiResult.suggestion}
            </p>
          </div>
        )}

        {emailDraft && (
          <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md p-4 rounded-lg border border-primary-100 dark:border-primary-500/20">
            <h4 className="text-xs font-bold text-primary-700 dark:text-primary-300 uppercase tracking-wider mb-2">
              Rascunho de Email
            </h4>
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed italic">
              &quot;{emailDraft}&quot;
            </p>
          </div>
        )}
      </div>

      {/* Objection Killer */}
      <div className="bg-rose-50 dark:bg-rose-900/10 p-6 rounded-xl border border-rose-100 dark:border-rose-500/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-rose-100 dark:bg-rose-500/20 rounded-lg text-rose-600 dark:text-rose-400">
            <Sword size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white font-display text-lg">
              Objection Killer
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              O cliente esta dificil? A IA te ajuda a negociar.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            className="flex-1 bg-white dark:bg-white/5 border border-rose-200 dark:border-rose-500/20 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
            placeholder="Ex: 'Achamos o preco muito alto' ou 'Preciso falar com meu socio'"
            value={objection}
            onChange={e => onObjectionChange(e.target.value)}
          />
          <Button
            onClick={onGenerateObjections}
            disabled={isGeneratingObjections || !objection.trim()}
            className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
          >
            {isGeneratingObjections ? (
              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              'Gerar Respostas'
            )}
          </Button>
        </div>

        {objectionResponses.length > 0 && (
          <div className="space-y-3">
            {objectionResponses.map((resp, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-white/5 p-3 rounded-lg border border-rose-100 dark:border-rose-500/10 flex gap-3"
              >
                <div className="shrink-0 w-6 h-6 bg-rose-100 dark:bg-rose-500/20 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold text-xs">
                  {idx + 1}
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200">{resp}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
