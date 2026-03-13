import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Repeat } from 'lucide-react';
import { Activity, Deal } from '@/types';
import { Button } from '@/components/ui/button';
import { getActivityIconCalendar } from '../utils';

interface ProjectedActivity extends Activity {
    _isProjected: true;
    _sourceId: string;
}

interface ActivitiesMonthlyCalendarProps {
    activities: Activity[];
    deals: Deal[];
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
    onEdit?: (activity: Activity) => void;
    onCreateFromProjected?: (activity: Activity) => void;
}

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

const ACTIVITY_TYPE_COLORS: Record<string, { bg: string; dot: string; text: string; gradient: string }> = {
    CALL: {
        bg: 'bg-blue-500/20',
        dot: 'bg-blue-500',
        text: 'text-blue-400',
        gradient: 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/50 hover:shadow-blue-500/70 border-blue-400',
    },
    MEETING: {
        bg: 'bg-purple-500/20',
        dot: 'bg-purple-500',
        text: 'text-purple-400',
        gradient: 'bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 border-purple-400',
    },
    EMAIL: {
        bg: 'bg-amber-500/20',
        dot: 'bg-amber-500',
        text: 'text-amber-400',
        gradient: 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/50 hover:shadow-amber-500/70 border-amber-400',
    },
    TASK: {
        bg: 'bg-emerald-500/20',
        dot: 'bg-emerald-500',
        text: 'text-emerald-400',
        gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/50 hover:shadow-emerald-500/70 border-emerald-400',
    },
    WHATSAPP: {
        bg: 'bg-emerald-500/20',
        dot: 'bg-emerald-500',
        text: 'text-emerald-400',
        gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/50 hover:shadow-emerald-500/70 border-emerald-400',
    },
    NOTE: {
        bg: 'bg-accent/20',
        dot: 'bg-accent',
        text: 'text-muted-foreground',
        gradient: 'bg-gradient-to-br from-muted-foreground to-muted-foreground/80 shadow-lg shadow-border/50 hover:shadow-border/70 border-border',
    },
    STATUS_CHANGE: {
        bg: 'bg-cyan-500/20',
        dot: 'bg-cyan-500',
        text: 'text-cyan-400',
        gradient: 'bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/70 border-cyan-400',
    },
};

const getTypeColor = (type: string) =>
    ACTIVITY_TYPE_COLORS[type] || ACTIVITY_TYPE_COLORS.NOTE;

const ActivitiesMonthlyCalendarInner: React.FC<ActivitiesMonthlyCalendarProps> = ({
    activities,
    deals,
    currentDate,
    setCurrentDate,
    onEdit,
    onCreateFromProjected,
}) => {
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);

    // Current month boundaries
    const monthYear = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        return { year, month };
    }, [currentDate]);

    const firstDayOfMonth = useMemo(
        () => new Date(monthYear.year, monthYear.month, 1),
        [monthYear]
    );

    const lastDayOfMonth = useMemo(
        () => new Date(monthYear.year, monthYear.month + 1, 0),
        [monthYear]
    );

    // Build the 6x7 grid of dates
    const calendarDays = useMemo(() => {
        const startDayOfWeek = firstDayOfMonth.getDay(); // 0=Sun
        const totalDays = lastDayOfMonth.getDate();
        const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

        // Days from previous month to fill first row
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const d = new Date(monthYear.year, monthYear.month, -i);
            days.push({ date: d, isCurrentMonth: false });
        }

        // Days of current month
        for (let d = 1; d <= totalDays; d++) {
            days.push({
                date: new Date(monthYear.year, monthYear.month, d),
                isCurrentMonth: true,
            });
        }

        // Fill remaining cells to complete 6 rows (42 cells)
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({
                date: new Date(monthYear.year, monthYear.month + 1, i),
                isCurrentMonth: false,
            });
        }

        return days;
    }, [firstDayOfMonth, lastDayOfMonth, monthYear]);

    // Month range timestamps for recurring expansion
    const monthRangeTs = useMemo(() => {
        const startTs = calendarDays[0].date.getTime();
        const endDate = calendarDays[calendarDays.length - 1].date;
        const endTs = endDate.getTime() + 86_400_000 - 1;
        return { startTs, endTs };
    }, [calendarDays]);

    // Recurrence expansion helpers (same pattern as ActivitiesCalendar)
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
        while (cursor.getTime() < targetTs) {
            switch (type) {
                case 'daily':
                    cursor.setDate(cursor.getDate() + 1);
                    break;
                case 'weekly':
                    cursor.setDate(cursor.getDate() + 7);
                    break;
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
            case 'daily':
                cursor.setDate(cursor.getDate() + 1);
                break;
            case 'weekly':
                cursor.setDate(cursor.getDate() + 7);
                break;
            case 'monthly': {
                cursor.setDate(1);
                cursor.setMonth(cursor.getMonth() + 1);
                const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
                cursor.setDate(Math.min(originDay, lastDay));
                break;
            }
        }
    };

    // Expand recurring activities for the visible month range
    const expandRecurringForMonth = useMemo(() => {
        const projected: ProjectedActivity[] = [];
        const { startTs, endTs } = monthRangeTs;

        for (const activity of activities) {
            if (!activity.recurrenceType || activity.completed) continue;

            const activityDate = new Date(activity.date);
            const originDay = activityDate.getDate();
            const activityHours = activityDate.getHours();
            const activityMinutes = activityDate.getMinutes();
            const endDate = activity.recurrenceEndDate
                ? new Date(activity.recurrenceEndDate + 'T23:59:59')
                : null;

            const cursor = new Date(activityDate);
            advanceCursorToTarget(cursor, startTs, activity.recurrenceType, originDay);

            const activityDateStr = activityDate.toISOString().split('T')[0];
            while (cursor.getTime() <= endTs) {
                if (endDate && cursor.getTime() > endDate.getTime()) break;

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
    }, [activities, monthRangeTs]);

    const allActivities = useMemo(
        () => [...activities, ...expandRecurringForMonth],
        [activities, expandRecurringForMonth]
    );

    // Index activities by date key (YYYY-M-D) for O(1) lookup
    const activitiesByDay = useMemo(() => {
        const map = new Map<string, (Activity | ProjectedActivity)[]>();
        for (const a of allActivities) {
            const d = new Date(a.date);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            const list = map.get(key);
            if (list) list.push(a);
            else map.set(key, [a]);
        }
        return map;
    }, [allActivities]);

    // Deal title lookup
    const dealTitleById = useMemo(() => {
        const map = new Map<string, string>();
        for (const d of deals) map.set(d.id, d.title);
        return map;
    }, [deals]);

    const isToday = (date: Date) => {
        const today = new Date();
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    };

    const isSameDay = (a: Date, b: Date) =>
        a.getDate() === b.getDate() &&
        a.getMonth() === b.getMonth() &&
        a.getFullYear() === b.getFullYear();

    const isOverdue = (activity: Activity) =>
        new Date(activity.date) < new Date() && !activity.completed;

    const prevMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() - 1);
        setCurrentDate(newDate);
    };

    const nextMonth = () => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
        setSelectedDay(new Date());
    };

    const handleDayClick = (date: Date) => {
        if (selectedDay && isSameDay(selectedDay, date)) {
            setSelectedDay(null);
        } else {
            setSelectedDay(date);
        }
    };

    // Get count badges per type for a given day
    const getTypeBadges = (date: Date) => {
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        const dayActivities = activitiesByDay.get(key);
        if (!dayActivities || dayActivities.length === 0) return null;

        const counts = new Map<string, number>();
        for (const a of dayActivities) {
            counts.set(a.type, (counts.get(a.type) || 0) + 1);
        }

        return Array.from(counts.entries()).map(([type, count]) => {
            const color = getTypeColor(type);
            return (
                <span
                    key={type}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-2xs font-bold ${color.bg} ${color.text}`}
                    title={`${count} ${type.toLowerCase()}`}
                >
                    <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
                    {count}
                </span>
            );
        });
    };

    // Activities for the selected day
    const selectedDayActivities = useMemo(() => {
        if (!selectedDay) return [];
        const key = `${selectedDay.getFullYear()}-${selectedDay.getMonth()}-${selectedDay.getDate()}`;
        const dayActivities = activitiesByDay.get(key) || [];
        return [...dayActivities].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
    }, [selectedDay, activitiesByDay]);

    const monthLabel = firstDayOfMonth.toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
    });

    return (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-border overflow-hidden shadow-xl">
            {/* Header */}
            <div className="p-6 border-b border-border flex justify-between items-center bg-gradient-to-r from-background to-muted dark:from-card/50 dark:to-card/50">
                <div className="flex items-center gap-4">
                    <h2 className="font-bold text-2xl text-foreground font-display capitalize">
                        {monthLabel}
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
                    <Button
                        onClick={prevMonth}
                        className="p-3 hover:bg-accent dark:hover:bg-white/10 rounded-xl transition-all hover:scale-110"
                    >
                        <ChevronLeft size={20} className="text-secondary-foreground dark:text-muted-foreground" />
                    </Button>
                    <Button
                        onClick={nextMonth}
                        className="p-3 hover:bg-accent dark:hover:bg-white/10 rounded-xl transition-all hover:scale-110"
                    >
                        <ChevronRight size={20} className="text-secondary-foreground dark:text-muted-foreground" />
                    </Button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-auto">
                {/* Day-of-week headers */}
                <div className="grid grid-cols-7 border-b border-border">
                    {DAYS_OF_WEEK.map((day) => (
                        <div
                            key={day}
                            className="p-3 text-center text-xs font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider bg-background dark:bg-white/5"
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Day cells - 6 rows */}
                <div className="grid grid-cols-7">
                    {calendarDays.map(({ date, isCurrentMonth }, idx) => {
                        const today = isToday(date);
                        const selected = selectedDay ? isSameDay(selectedDay, date) : false;
                        const badges = getTypeBadges(date);
                        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                        const dayCount = (activitiesByDay.get(key) || []).length;

                        return (
                            <div
                                key={idx}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleDayClick(date)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleDayClick(date);
                                    }
                                }}
                                className={`
                                    relative min-h-[100px] p-2 border-b border-r border-border 
                                    cursor-pointer transition-all
                                    ${!isCurrentMonth ? 'opacity-40' : ''}
                                    ${today ? 'bg-primary-50/30 dark:bg-primary-500/10' : ''}
                                    ${selected ? 'ring-2 ring-inset ring-primary-500 dark:ring-primary-400 bg-primary-50/50 dark:bg-primary-500/15' : ''}
                                    ${isCurrentMonth && !today && !selected ? 'hover:bg-background dark:hover:bg-white/5' : ''}
                                `}
                            >
                                {/* Day number */}
                                <div className="flex items-center justify-between mb-1">
                                    <span
                                        className={`
                                            inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold
                                            ${today
                                                ? 'bg-primary-500 text-white'
                                                : isCurrentMonth
                                                    ? 'text-foreground '
                                                    : 'text-muted-foreground dark:text-secondary-foreground'
                                            }
                                        `}
                                    >
                                        {date.getDate()}
                                    </span>
                                    {dayCount > 0 && (
                                        <span className="text-2xs font-bold px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300">
                                            {dayCount}
                                        </span>
                                    )}
                                </div>

                                {/* Activity type badges */}
                                {badges && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {badges}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Selected day detail panel */}
            {selectedDay && (
                <div className="border-t border-border bg-background/50 dark:bg-white/[0.02]">
                    <div className="p-4">
                        <h3 className="font-bold text-base text-foreground mb-3">
                            {selectedDay.toLocaleDateString('pt-BR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                            })}
                            {selectedDayActivities.length > 0 && (
                                <span className="ml-2 text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                                    ({selectedDayActivities.length} atividade{selectedDayActivities.length !== 1 ? 's' : ''})
                                </span>
                            )}
                        </h3>

                        {selectedDayActivities.length === 0 ? (
                            <p className="text-sm text-muted-foreground dark:text-muted-foreground py-4 text-center">
                                Nenhuma atividade neste dia
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {selectedDayActivities.map((activity) => {
                                    const isProjected =
                                        '_isProjected' in activity &&
                                        (activity as ProjectedActivity)._isProjected;
                                    const typeColor = getTypeColor(activity.type);
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
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    handleClick();
                                                }
                                            }}
                                            className={`
                                                group relative flex items-center gap-3 p-3 rounded-xl
                                                ${isProjected ? 'border-2 border-dashed opacity-70' : 'border-2'}
                                                ${typeColor.gradient}
                                                ${activity.completed ? 'opacity-50 saturate-50' : ''}
                                                ${!isProjected && isOverdue(activity) && !activity.completed ? 'ring-2 ring-red-500 ring-offset-2 dark:ring-offset-slate-900' : ''}
                                                transition-all duration-300
                                                hover:scale-[1.02] hover:-translate-y-0.5
                                                cursor-pointer overflow-hidden
                                            `}
                                            title={
                                                isProjected
                                                    ? 'Clique para criar esta atividade'
                                                    : `${onEdit ? 'Clique para editar -- ' : ''}${activity.title}`
                                            }
                                        >
                                            {/* Shine effect */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />

                                            <div className="relative z-10 flex items-center gap-3 w-full">
                                                <div className="p-1.5 bg-white/20 rounded-md shrink-0">
                                                    {isProjected ? (
                                                        <Repeat size={14} className="text-white" />
                                                    ) : (
                                                        getActivityIconCalendar(activity.type)
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-white text-sm">
                                                            {new Date(activity.date).toLocaleTimeString(
                                                                'pt-BR',
                                                                { hour: '2-digit', minute: '2-digit' }
                                                            )}
                                                        </span>
                                                        <span
                                                            className={`font-bold text-white leading-tight truncate ${
                                                                activity.completed ? 'line-through' : ''
                                                            }`}
                                                        >
                                                            {activity.title}
                                                        </span>
                                                    </div>
                                                    {activity.dealId && (
                                                        <p className="text-xs text-white/70 mt-0.5 truncate">
                                                            {dealTitleById.get(activity.dealId) || 'Deal vinculado'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const ActivitiesMonthlyCalendar = React.memo(ActivitiesMonthlyCalendarInner);
