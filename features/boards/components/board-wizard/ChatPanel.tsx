import React from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatMessage } from '@/features/boards/components/board-wizard/types';
import { GeneratedBoard } from '@/lib/ai/tasksClient';

interface ChatPanelProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  isRefining: boolean;
  previewBoard: GeneratedBoard | null;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  onChatInputChange: (value: string) => void;
  onRefine: () => void;
  onPreviewToggle: (proposal: GeneratedBoard) => void;
  onApplyProposal: (proposal: GeneratedBoard) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  chatMessages,
  chatInput,
  isRefining,
  previewBoard,
  chatEndRef,
  onChatInputChange,
  onRefine,
  onPreviewToggle,
  onApplyProposal,
}) => {
  return (
    <div className="h-[38vh] lg:h-auto w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-white/10 flex flex-col bg-slate-50 dark:bg-dark-bg/50">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {chatMessages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[90%] p-3 rounded-xl text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white rounded-br-none'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none'
              }`}
            >
              {msg.content
                .split(/(\*\*.*?\*\*)/)
                .map((part, i) =>
                  part.startsWith('**') && part.endsWith('**') ? (
                    <strong key={i}>{part.slice(2, -2)}</strong>
                  ) : (
                    part
                  )
                )}
            </div>

            {msg.proposalData && (
              <div className="mt-2 flex gap-2">
                <Button
                  onClick={() => onPreviewToggle(msg.proposalData!)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1 ${
                    previewBoard === msg.proposalData
                      ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500/50 dark:text-blue-300'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {previewBoard === msg.proposalData
                    ? 'Esconder Preview'
                    : 'Ver Preview'}
                </Button>
                <Button
                  onClick={() => onApplyProposal(msg.proposalData!)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors flex items-center gap-1"
                >
                  Aplicar
                </Button>
              </div>
            )}
          </div>
        ))}
        {isRefining && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 p-3 rounded-xl rounded-bl-none flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-primary-500" />
              <span className="text-xs text-slate-500">Pensando...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-dark-card">
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => onChatInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isRefining) onRefine();
            }}
            placeholder="Ex: Adicione uma etapa de 'Negociacao'..."
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isRefining}
          />
          <Button
            onClick={onRefine}
            disabled={!chatInput.trim() || isRefining}
            className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 disabled:opacity-50 transition-colors"
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
};
