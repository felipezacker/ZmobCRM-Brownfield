import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Repeat } from 'lucide-react';
import { Activity, Deal } from '@/types';
import { Button } from '@/components/ui/button';
import { getActivityIconCalendar } from '../utils';

interface ProjectedActivity extends Activity {
    _isProjected: true;
    _sourceId: string;
}

interface ActivitiesCalendarProps {
    activities: Activity[];
    deals: Deal[];
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
    onEdit?: (activity: Activity) => void;
    onCreateFromProjected?: (activity: Activity) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 to 20:00
const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const ActivitiesCalendar: React.FC<ActivitiesCalendarProps> = ({
    activities,
    deals,
    currentDate,
    setCurrentDate,
    onEdit,
    onCreateFromProjected
}) => {
    const getWeekStart = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    };

    const weekStartTs = useMemo(() => getWeekStart(currentDate).getTime(), [currentDate]);
    const weekStart = useMemo(() => new Date(weekStartTs), [weekStartTs]);
    const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
        const date = new Date(weekStartTs);
        date.setDate(date.getDate() + i);
        return date;
    }), [weekStartTs]);

    const prevWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const nextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const getActivityGradient = (type: Activity['type']) => {
        switch (type) {
            case 'CALL': return 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/50 hover:shadow-blue-500/70 border-blue-400';
            case 'MEETING': return 'bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 border-purple-400';
            case 'EMAIL': return 'bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/50 hover:shadow-green-500/70 border-green-400';
            case 'TASK': return 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/50 hover:shadow-orange-500/70 border-orange-400';
            default: return 'bg-gradient-to-br from-muted-foreground to-muted-foreground/80 shadow-lg shadow-border/50 hover:shadow-border/70 border-border';
        }
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const isOverdue = (activity: Activity) => {
        return new Date(activity.date) < new Date() && !activity.completed;
    };

    // Avanca cursor ate (ou alem de) targetTs usando calculo direto O(1) para daily/weekly,
    // e loop limitado para monthly (maximo ~12 iteracoes/ano).
    const advanceCursorToTarget = (cursor: Date, targetTs: number, type: string, originDay: number) => {
        if (cursor.getTime() >= targetTs) return;
        const diffMs = targetTs - cursor.getTime();
        if (type === 'daily') {
            const steps = Math.floor(diffMs / 86_400_000);
            cursor.setDate(cursor.getDate() + steps);
        } else if (type === 'weekly') {
            const steps = Math.floor(diffMs / (7 * 86_400_000));
            cursor.setDate(cursor.getDate() + steps * 7);
        }
        // Para monthly (ou remainder de daily/weekly), loop residual
        while (cursor.getTime() < targetTs) {
            switch (type) {
                case 'daily': cursor.setDate(cursor.getDate() + 1); break;
                case 'weekly': cursor.setDate(cursor.getDate() + 7); break;
                case 'monthly': {
                    cursor.setDate(1);
                    cursor.setMonth(cursor.getMonth() + 1);
                    const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
                    cursor.setDate(Math.min(originDay, lastDay));
                    break;
                }
            }
        }
    };

    const advanceCursor = (cursor: Date, type: string, originDay: number) => {
        switch (type) {
            case 'daily': cursor.setDate(cursor.getDate() + 1); break;
            case 'weekly': cursor.setDate(cursor.getDate() + 7); break;
            case 'monthly': {
                cursor.setDate(1);
                cursor.setMonth(cursor.getMonth() + 1);
                const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
                cursor.setDate(Math.min(originDay, lastDay));
                break;
            }
        }
    };

    // Expande atividades recorrentes em instancias virtuais para a semana visivel
    const expandRecurringForWeek = useMemo(() => {
        const projected: ProjectedActivity[] = [];
        const weekStartTs = weekDays[0].getTime();
        const weekEndTs = weekDays[6].getTime() + 86_400_000 - 1;

        for (const activity of activities) {
            if (!activity.recurrenceType || activity.completed) continue;

            const activityDate = new Date(activity.date);
            const originDay = activityDate.getDate();
            const activityHours = activityDate.getHours();
            const activityMinutes = activityDate.getMinutes();
            const endDate = activity.recurrenceEndDate ? new Date(activity.recurrenceEndDate + 'T23:59:59') : null;

            // Avancar cursor ate o inicio da semana visivel — O(1) para daily/weekly
            const cursor = new Date(activityDate);
            advanceCursorToTarget(cursor, weekStartTs, activity.recurrenceType, originDay);

            // Gerar instancias dentro da semana visivel
            const activityDateStr = activityDate.toISOString().split('T')[0];
            while (cursor.getTime() <= weekEndTs) {
                if (endDate && cursor.getTime() > endDate.getTime()) break;

                // So projetar se nao e a mesma data da atividade original (ja aparece como real)
                const cursorDateStr = cursor.toISOString().split('T')[0];
                if (cursorDateStr !== activityDateStr) {
                    const projectedDate = new Date(cursor);
                    projectedDate.setHours(activityHours, activityMinutes, 0, 0);

                    projected.push({
                        ...activity,
                        id: `projected-${activity.id}-${cursorDateStr}`,
                        date: projectedDate.toISOString(),
                        _isProjected: true,
                        _sourceId: activity.id,
                    });
                }

                advanceCursor(cursor, activity.recurrenceType, originDay);
            }
        }
        return projected;
    }, [activities, weekDays]);

    // Combina atividades reais + projetadas
    const allActivities = useMemo(() => [...activities, ...expandRecurringForWeek], [activities, expandRecurringForWeek]);

    // Performance: grid chama `getActivitiesForDateTime` muitas vezes.
    // Indexamos atividades por (YYYY-MM-DD|hour) uma vez para evitar filters repetidos.
    const activitiesByDayHour = useMemo(() => {
        const map = new Map<string, (Activity | ProjectedActivity)[]>();
        for (const a of allActivities) {
            const d = new Date(a.date);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}|${d.getHours()}`;
            const list = map.get(key);
            if (list) list.push(a);
            else map.set(key, [a]);
        }
        return map;
    }, [allActivities]);

    // Contagem de atividades por dia para exibir nos headers (inclui projetadas)
    const countByDay = useMemo(() => {
        const map = new Map<string, number>();
        for (const a of allActivities) {
            const d = new Date(a.date);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            map.set(key, (map.get(key) || 0) + 1);
        }
        return map;
    }, [allActivities]);

    // Performance: evitar `deals.find` em hover/tooltips.
    const dealTitleById = useMemo(() => {
        const map = new Map<string, string>();
        for (const d of deals) map.set(d.id, d.title);
        return map;
    }, [deals]);

    return (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-border overflow-hidden shadow-xl">
            {/* Header */}
            <div className="p-6 border-b border-border flex justify-between items-center bg-gradient-to-r from-background to-muted dark:from-card/50 dark:to-card/50">
                <div className="flex items-center gap-4">
                    <h2 className="font-bold text-2xl text-foreground font-display">
                        {weekStart.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </h2>
                    <Button
                        onClick={goToToday}
                        className="px-4 py-2 text-sm font-bold bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:scale-105"
                    >
                        <CalendarIcon size={14} />
                        Hoje
                    </Button>
                </div>
                <div className="flex gap-2">
                    <Button onClick={prevWeek} className="p-3 hover:bg-accent dark:hover:bg-white/10 rounded-xl transition-all hover:scale-110">
                        <ChevronLeft size={20} className="text-secondary-foreground dark:text-muted-foreground" />
                    </Button>
                    <Button onClick={nextWeek} className="p-3 hover:bg-accent dark:hover:bg-white/10 rounded-xl transition-all hover:scale-110">
                        <ChevronRight size={20} className="text-secondary-foreground dark:text-muted-foreground" />
                    </Button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-auto max-h-[calc(100dvh-280px)]">
                <div className="min-w-[800px]">
                    {/* Day Headers */}
                    <div className="grid grid-cols-8 border-b border-border sticky top-0 bg-white dark:bg-dark-card z-10 shadow-sm">
                        <div className="p-3 text-xs font-bold text-muted-foreground uppercase bg-background dark:bg-white/5"></div>
                        {weekDays.map((date, i) => (
                            <div
                                key={i}
                                className={`p-4 text-center border-l border-border  transition-all ${isToday(date)
                                        ? 'bg-gradient-to-b from-primary-50 to-primary-100 dark:from-primary-500/20 dark:to-primary-500/10'
                                        : 'bg-background dark:bg-white/5'
                                    }`}
                            >
                                <div className="text-xs font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                                    {DAYS_OF_WEEK[date.getDay()]}
                                </div>
                                <div className="flex items-center justify-center gap-1.5 mt-1">
                                    <span className={`text-2xl font-bold font-display ${isToday(date)
                                            ? 'text-primary-600 dark:text-primary-400'
                                            : 'text-foreground '
                                        }`}>
                                        {date.getDate()}
                                    </span>
                                    {(() => {
                                        const dayCount = countByDay.get(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`) || 0;
                                        return dayCount > 0 ? (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300">
                                                {dayCount}
                                            </span>
                                        ) : null;
                                    })()}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Time Slots */}
                    {HOURS.map(hour => (
                        <div key={hour} className="grid grid-cols-8 border-b border-border">
                            <div className="p-3 text-sm font-bold text-secondary-foreground dark:text-muted-foreground bg-background dark:bg-white/5 text-right pr-4">
                                {hour}:00
                            </div>
                            {weekDays.map((date, i) => {
                                const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}|${hour}`;
                                const hourActivities = activitiesByDayHour.get(key) ?? [];
                                return (
                                    <div
                                        key={i}
                                        className={`min-h-[70px] p-2 border-l border-border  transition-colors ${isToday(date)
                                                ? 'bg-primary-50/20 dark:bg-primary-500/5'
                                                : ''
                                            }`}
                                    >
                                        <div className="space-y-2">
                                            {hourActivities.map(activity => {
                                                const isProjected = '_isProjected' in activity && (activity as ProjectedActivity)._isProjected;
                                                const handleClick = () => {
                                                    if (isProjected && onCreateFromProjected) {
                                                        onCreateFromProjected(activity);
                                                    } else {
                                                        onEdit?.(activity);
                                                    }
                                                };
                                                return (
                                                <div
                                                    key={activity.id}
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={handleClick}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
                                                    className={`
                                                        group relative
                                                        text-xs p-3 rounded-xl
                                                        ${isProjected ? 'border-2 border-dashed opacity-70' : 'border-2'}
                                                        ${getActivityGradient(activity.type)}
                                                        ${activity.completed ? 'opacity-50 saturate-50' : ''}
                                                        ${!isProjected && isOverdue(activity) && !activity.completed ? 'ring-2 ring-red-500 ring-offset-2 dark:ring-offset-slate-900' : ''}
                                                        transition-all duration-300
                                                        hover:scale-105 hover:-translate-y-1
                                                        cursor-pointer
                                                        overflow-hidden
                                                    `}
                                                    title={isProjected ? 'Clique para criar esta atividade' : `${onEdit ? 'Clique para editar — ' : ''}${activity.title}`}
                                                >
                                                    {/* Shine effect on hover */}
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>

                                                    <div className="relative z-10">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className="p-1 bg-white/20 rounded-md">
                                                                {isProjected ? <Repeat size={14} className="text-white" /> : getActivityIconCalendar(activity.type)}
                                                            </div>
                                                            <span className="font-bold text-white text-sm">
                                                                {new Date(activity.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <div className={`font-bold text-white leading-tight ${activity.completed ? 'line-through' : ''}`}>
                                                            {activity.title}
                                                        </div>

                                                        {/* Hover Expanded Info */}
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-2 pt-2 border-t border-white/20">
                                                            <p className="text-xs text-white/90 leading-relaxed">
                                                                {isProjected ? 'Clique para materializar esta ocorrência' : (activity.description || '')}
                                                            </p>
                                                            {activity.dealId && (
                                                                <p className="text-xs text-white/80 mt-1 font-medium">
                                                                    {dealTitleById.get(activity.dealId) || 'Deal vinculado'}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
