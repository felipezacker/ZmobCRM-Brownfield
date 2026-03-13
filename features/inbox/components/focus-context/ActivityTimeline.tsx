import React from 'react';
import {
    Phone,
    Mail,
    Calendar,
    FileText,
    CheckCircle2,
    ArrowUpRight,
    Filter,
    Search,
    MessageCircle,
    Clock,
} from 'lucide-react';
import type { Activity, Board, Contact, Deal } from '@/types';
import { Button } from '@/components/ui/button';
import { TAILWIND_TO_HEX } from './constants';
import { DEFAULT_STAGE_COLOR } from '@/lib/design-tokens';
import type { ScheduleType } from '../ScheduleModal';
import type { MessageChannel } from '../MessageComposerModal';

interface ActivityTimelineProps {
    activities: Activity[];
    board?: Board;
    contact?: Contact;
    deal: Deal;
    note: string;
    onNoteChange: (value: string) => void;
    onAddActivity: (activity: Partial<Activity>) => void | Promise<Activity | null>;
    onQuickAction: (type: ScheduleType, prefill?: { title?: string; description?: string }) => void;
    onWhatsApp: (prefill?: { message?: string }) => void;
    onEmail: (prefill?: { subject?: string; message?: string }) => void;
    buildWhatsAppMessage: (actionType: string, action: string) => string;
    buildEmailBody: (actionType: string, action: string) => string;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
    activities,
    board,
    contact,
    deal,
    note,
    onNoteChange,
    onAddActivity,
    onQuickAction,
    onWhatsApp,
    onEmail,
    buildWhatsAppMessage,
    buildEmailBody,
}) => {
    return (
        <div className="flex-1 flex flex-col min-w-0 border-r border-dark-border">
            {/* Header */}
            <div className="shrink-0 h-12 flex items-center justify-between px-6 border-b border-border">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Atividades
                </h3>
                <div className="flex items-center gap-1">
                    <Button className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors">
                        <Filter size={14} />
                    </Button>
                    <Button className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors">
                        <Search size={14} />
                    </Button>
                </div>
            </div>

            {/* Activity List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 p-6">
                {activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                        <div className="w-12 h-12 bg-card/50 rounded-xl flex items-center justify-center mb-4 border border-border/50">
                            <ArrowUpRight size={24} className="text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">Nenhuma atividade</p>
                        <p className="text-sm text-muted-foreground max-w-[200px]">
                            Comece adicionando uma nota ou agendando uma acao.
                        </p>
                    </div>
                ) : (
                    <div className="relative pl-0 py-2">
                        <div className="absolute left-[27px] top-0 bottom-0 w-px bg-card/50" />
                        {activities.slice(0, 50).map((activity, idx) => {
                            const Icon = activity.type === 'CALL' ? Phone :
                                activity.type === 'EMAIL' ? Mail :
                                    activity.type === 'MEETING' ? Calendar :
                                        activity.type === 'NOTE' ? FileText :
                                            CheckCircle2;

                            return (
                                <div
                                    key={activity.id}
                                    className="relative pl-[54px] pr-6 py-4 group hover:bg-accent/50 transition-colors border-b border-border"
                                >
                                    {/* Timeline Node */}
                                    <div className={`absolute left-[18px] top-[18px] w-[20px] h-[20px] rounded-full flex items-center justify-center z-10
                                    border transition-all shadow-[0_0_10px_-3px_rgba(0,0,0,0.5)]
                                    ${activity.type === 'CALL' ? 'bg-blue-950/30 border-blue-500/30 text-blue-400 group-hover:border-blue-500 group-hover:shadow-blue-500/20' :
                                            activity.type === 'EMAIL' ? 'bg-purple-950/30 border-purple-500/30 text-purple-400 group-hover:border-purple-500 group-hover:shadow-purple-500/20' :
                                                activity.type === 'MEETING' ? 'bg-orange-950/30 border-orange-500/30 text-orange-400 group-hover:border-orange-500 group-hover:shadow-orange-500/20' :
                                                    'bg-card border-border text-muted-foreground group-hover:border-border'
                                        }`}
                                    >
                                        <Icon size={10} strokeWidth={2.5} />
                                    </div>

                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex flex-col gap-1 flex-1">
                                            <div className="flex items-center gap-2">
                                                <ActivityTypeBadge activity={activity} board={board} />
                                                <span className={`text-sm font-medium transition-colors ${activity.completed ? 'text-muted-foreground' : 'text-foreground'}`}>
                                                    {activity.title.includes('Moveu para') ? (
                                                        <StageMoveBadge title={activity.title} board={board} />
                                                    ) : activity.title}
                                                </span>
                                            </div>
                                            {activity.description && (
                                                <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-muted-foreground transition-colors">
                                                    {activity.description}
                                                </p>
                                            )}
                                        </div>
                                        <span className="text-[11px] text-secondary-foreground font-mono shrink-0 self-center">
                                            {new Date(activity.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {new Date(activity.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="shrink-0 p-4 border-t border-border">
                <div className="flex flex-wrap gap-2 mb-3">
                    <Button
                        onClick={() => onWhatsApp({ message: buildWhatsAppMessage('TASK', `Queria falar sobre ${deal.title}`) })}
                        disabled={!contact?.phone}
                        className="px-3 py-1.5 hover:bg-green-500/10 text-muted-foreground hover:text-green-400 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium rounded-md transition-colors flex items-center gap-2 group"
                    >
                        <MessageCircle size={14} className="group-hover:text-green-400 transition-colors" /> WhatsApp
                    </Button>
                    <Button
                        onClick={() => onEmail({ subject: `Sobre ${deal.title}`, message: buildEmailBody('TASK', `Queria falar sobre ${deal.title}`) })}
                        disabled={!contact?.email}
                        className="px-3 py-1.5 hover:bg-cyan-500/10 text-muted-foreground hover:text-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium rounded-md transition-colors flex items-center gap-2 group"
                    >
                        <Mail size={14} className="group-hover:text-cyan-400 transition-colors" /> Email
                    </Button>
                    <span className="w-px h-6 bg-card self-center" />
                    <Button
                        onClick={() => onQuickAction('CALL')}
                        className="px-3 py-1.5 hover:bg-blue-500/10 text-muted-foreground hover:text-blue-400 text-xs font-medium rounded-md transition-colors flex items-center gap-2 group"
                    >
                        <Phone size={14} className="group-hover:text-blue-400 transition-colors" /> Ag. Ligacao
                    </Button>
                    <Button
                        onClick={() => onQuickAction('MEETING')}
                        className="px-3 py-1.5 hover:bg-purple-500/10 text-muted-foreground hover:text-purple-400 text-xs font-medium rounded-md transition-colors flex items-center gap-2 group"
                    >
                        <Calendar size={14} className="group-hover:text-purple-400 transition-colors" /> Ag. Reuniao
                    </Button>
                    <Button
                        onClick={() => onQuickAction('TASK')}
                        className="px-3 py-1.5 hover:bg-orange-500/10 text-muted-foreground hover:text-orange-400 text-xs font-medium rounded-md transition-colors flex items-center gap-2 group"
                    >
                        <Clock size={14} className="group-hover:text-orange-400 transition-colors" /> Ag. Tarefa
                    </Button>
                </div>

                <div className="relative group">
                    <textarea
                        value={note}
                        onChange={(e) => onNoteChange(e.target.value)}
                        placeholder="Escreva..."
                        className="w-full min-h-[120px] bg-card/50 border border-border ring-1 ring-ring/30 focus:border-primary-500 focus:ring-primary-500/40 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-all resize-none"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.metaKey && note.trim()) {
                                onAddActivity({
                                    type: 'NOTE',
                                    title: 'Nota',
                                    description: note,
                                    date: new Date().toISOString(),
                                    completed: true
                                });
                                onNoteChange('');
                            }
                        }}
                    />
                    <div className="absolute right-2 bottom-2 flex items-center gap-2">
                        <span className="text-[10px] text-secondary-foreground border border-border rounded px-1.5 py-0.5">
                            Cmd + Enter
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Internal helper components ---

function ActivityTypeBadge({ activity, board }: { activity: Activity; board?: Board }) {
    if (activity.type === 'STATUS_CHANGE' || activity.title.includes('Moveu para')) {
        return (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide shrink-0 bg-accent/50 text-muted-foreground">
                Status
            </span>
        );
    }
    const typeColor =
        activity.type === 'CALL' ? 'bg-blue-500/20 text-blue-400' :
            activity.type === 'EMAIL' ? 'bg-purple-500/20 text-purple-400' :
                activity.type === 'MEETING' ? 'bg-orange-500/20 text-orange-400' :
                    activity.type === 'NOTE' ? 'bg-emerald-500/20 text-emerald-400' :
                        activity.type === 'TASK' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-accent/50 text-muted-foreground';
    const typeLabel =
        activity.type === 'CALL' ? 'Ligacao' :
            activity.type === 'EMAIL' ? 'Email' :
                activity.type === 'MEETING' ? 'Reuniao' :
                    activity.type === 'NOTE' ? 'Nota' :
                        activity.type === 'TASK' ? 'Tarefa' :
                            activity.type;
    return (
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide shrink-0 ${typeColor}`}>
            {typeLabel}
        </span>
    );
}

function StageMoveBadge({ title, board }: { title: string; board?: Board }) {
    const stageName = title.replace('Moveu para', '').trim();
    const matchingStage = board?.stages.find(s =>
        s.label.toLowerCase() === stageName.toLowerCase()
    );
    const hexColor = TAILWIND_TO_HEX[matchingStage?.color || ''] || DEFAULT_STAGE_COLOR;

    return (
        <span className="flex items-center gap-2">
            Moveu para
            <span
                className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border"
                style={{
                    backgroundColor: `${hexColor}20`,
                    color: hexColor,
                    borderColor: `${hexColor}40`,
                }}
            >
                {stageName}
            </span>
        </span>
    );
}
