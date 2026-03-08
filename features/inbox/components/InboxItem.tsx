import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity } from '@/types';
import { CheckCircle2, Clock, Calendar, Phone, Mail, FileText, Building2, MoreHorizontal, X, SkipForward, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InboxItemProps {
  activity: Activity;
  onToggleComplete: (id: string) => void;
  onSnooze?: (id: string) => void;
  onDiscard?: (id: string) => void;
  onSelect?: (id: string) => void;
}

/**
 * Performance: Inbox pode ter muitas linhas; `React.memo` evita re-render em massa
 * quando apenas 1 item muda (ex.: abrir/fechar menu local).
 */
const InboxItemComponent: React.FC<InboxItemProps> = ({
  activity,
  onToggleComplete,
  onSnooze,
  onDiscard,
  onSelect
}) => {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const isMeeting = activity.type === 'MEETING' || activity.type === 'CALL';

  const handleEdit = () => {
    router.push(`/activities?edit=${activity.id}`);
  };
  const date = new Date(activity.date);
  const timeString = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const getIconColor = () => {
    switch (activity.type) {
      case 'CALL': return 'text-blue-500';
      case 'MEETING': return 'text-purple-500';
      case 'EMAIL': return 'text-amber-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="group flex items-start gap-4 p-4 bg-white dark:bg-dark-card border border-border rounded-xl hover:shadow-md hover:border-border dark:hover:border-white/10 transition-all duration-200">
      {/* Left: Time or Checkbox */}
      <div className="shrink-0 pt-0.5">
        {isMeeting ? (
          <div className={`flex flex-col items-center justify-center w-12 h-10 rounded-lg ${getIconColor()} bg-current/10`}>
            <span className="text-xs font-bold text-current">{timeString}</span>
          </div>
        ) : (
          <Button
            onClick={() => onToggleComplete(activity.id)}
            aria-label={activity.completed ? 'Marcar como pendente' : 'Marcar como concluído'}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${activity.completed
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-border dark:border-border hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 text-transparent hover:text-green-500'
              }`}
          >
            <CheckCircle2 size={12} aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={handleEdit}>
        <div className="text-left group/title">
          <h3 className={`font-medium text-foreground  group-hover/title:text-primary-500 transition-colors ${activity.completed ? 'line-through text-muted-foreground dark:text-muted-foreground' : ''}`}>
            {activity.title}
          </h3>
        </div>

        {activity.description && (
          <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-0.5 line-clamp-1">
            {activity.description}
          </p>
        )}

        {/* Context */}
        {activity.dealTitle && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground dark:text-muted-foreground">
            <Building2 size={12} />
            <span className="truncate">{activity.dealTitle}</span>
          </div>
        )}

        {/* Helper text to open edit */}
        {!activity.dealTitle && (
          <Button
            onClick={handleEdit}
            className="flex items-center gap-1 mt-2 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
          >
            Ver detalhes
          </Button>
        )}
      </div>

      {/* Actions Menu */}
      <div className="relative shrink-0">
        <Button
          onClick={() => setShowMenu(!showMenu)}
          aria-label="Menu de opções"
          aria-expanded={showMenu}
          aria-haspopup="true"
          className="p-1.5 text-muted-foreground hover:text-secondary-foreground dark:hover:text-muted-foreground hover:bg-muted dark:hover:bg-white/5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
        >
          <MoreHorizontal size={18} aria-hidden="true" />
        </Button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-dark-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
              <Button
                onClick={() => { handleEdit(); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary-foreground dark:text-muted-foreground hover:bg-background dark:hover:bg-white/5"
              >
                <Edit2 size={14} className="text-primary-500" />
                Editar
              </Button>
              {isMeeting && (
                <Button
                  onClick={() => { onToggleComplete(activity.id); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary-foreground dark:text-muted-foreground hover:bg-background dark:hover:bg-white/5"
                >
                  <CheckCircle2 size={14} className="text-green-500" />
                  Concluir
                </Button>
              )}
              {onSnooze && (
                <Button
                  onClick={() => { onSnooze(activity.id); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary-foreground dark:text-muted-foreground hover:bg-background dark:hover:bg-white/5"
                >
                  <Clock size={14} className="text-orange-500" />
                  Adiar 1 dia
                </Button>
              )}
              {onDiscard && (
                <Button
                  onClick={() => { onDiscard(activity.id); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <X size={14} />
                  Remover
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const InboxItem = React.memo(InboxItemComponent);
