import React from 'react';
import { Check, MessageSquare, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActivityRow } from '@/features/activities/components/ActivityRow';
import type { DealDetailTimelineProps } from '@/features/boards/components/deal-detail/types';

export const DealDetailTimeline: React.FC<DealDetailTimelineProps> = ({
  deal,
  contact,
  timelineFeed,
  newNote,
  noteTextareaRef,
  activitiesById,
  onNewNoteChange,
  onAddNote,
  onToggleActivity,
  onEditActivity,
  onDeleteActivity,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-white/5 border border-border rounded-xl p-4 shadow-sm">
        <textarea
          ref={noteTextareaRef}
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[80px]"
          placeholder="Escreva uma nota..."
          value={newNote}
          onChange={e => onNewNoteChange(e.target.value)}
        ></textarea>
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
          <div />
          <Button
            onClick={onAddNote}
            disabled={!newNote.trim()}
            className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
          >
            <Check size={14} /> Enviar
          </Button>
        </div>
      </div>

      {/* Contact notes (pinned) */}
      {contact?.notes && (
        <div className="flex items-start gap-3 p-3 bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/30 rounded-xl">
          <StickyNote size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Nota do contato</p>
            <p className="text-sm text-secondary-foreground dark:text-muted-foreground whitespace-pre-wrap">{contact.notes}</p>
          </div>
        </div>
      )}

      {/* Unified timeline: activities + deal notes */}
      <div className="space-y-3 pl-4 border-l border-border dark:border-border">
        {timelineFeed.length === 0 && !contact?.notes && (
          <p className="text-sm text-muted-foreground italic pl-4">
            Nenhuma atividade ou nota registrada.
          </p>
        )}
        {timelineFeed.map(item => {
          if (item.kind === 'activity') {
            const activity = item.data;
            return (
              <ActivityRow
                key={`act-${activity.id}`}
                activity={activity}
                deal={deal}
                onToggleComplete={id => {
                  const act = activitiesById.get(id);
                  if (act) onToggleActivity(id);
                }}
                onEdit={onEditActivity}
                onDelete={onDeleteActivity}
              />
            );
          }
          // kind === 'note' (deal note)
          const note = item.data;
          return (
            <div key={`note-${note.id}`} className="flex items-start gap-3 pl-4 py-2">
              <MessageSquare size={14} className="text-primary-500 mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground dark:text-muted-foreground whitespace-pre-wrap">{note.content}</p>
                <p className="text-1xs text-muted-foreground dark:text-muted-foreground mt-1">
                  {new Date(note.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  {' '}
                  {new Date(note.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
