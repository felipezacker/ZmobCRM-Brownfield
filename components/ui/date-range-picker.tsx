import React, { useState, useMemo, useCallback } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  isBefore,
  isAfter,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  from: string;
  to: string;
  onChangeFrom: (date: string) => void;
  onChangeTo: (date: string) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  from,
  to,
  onChangeFrom,
  onChangeTo,
}) => {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [hovered, setHovered] = useState<Date | null>(null);

  // 'start' = next click sets from, 'end' = next click sets to
  const [picking, setPicking] = useState<'start' | 'end'>('start');

  const fromDate = from ? new Date(from + 'T00:00:00') : null;
  const toDate = to ? new Date(to + 'T00:00:00') : null;

  const days = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [viewMonth]);

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const toIso = (d: Date) => format(d, 'yyyy-MM-dd');

  const handleDayClick = useCallback((day: Date) => {
    if (picking === 'start') {
      onChangeFrom(toIso(day));
      onChangeTo('');
      setPicking('end');
    } else {
      // If clicked before fromDate, swap
      if (fromDate && isBefore(day, fromDate)) {
        onChangeTo(toIso(fromDate));
        onChangeFrom(toIso(day));
      } else {
        onChangeTo(toIso(day));
      }
      setPicking('start');
      setOpen(false);
    }
  }, [picking, fromDate, onChangeFrom, onChangeTo]);

  const isInRange = (day: Date) => {
    if (!fromDate) return false;
    const end = picking === 'end' && hovered ? hovered : toDate;
    if (!end) return false;
    const rangeStart = isBefore(end, fromDate) ? end : fromDate;
    const rangeEnd = isAfter(end, fromDate) ? end : fromDate;
    return isWithinInterval(day, { start: rangeStart, end: rangeEnd });
  };

  const isStart = (day: Date) => fromDate && isSameDay(day, fromDate);
  const isEnd = (day: Date) => toDate && isSameDay(day, toDate);

  const label = fromDate && toDate
    ? `${format(fromDate, 'dd/MM/yyyy')} — ${format(toDate, 'dd/MM/yyyy')}`
    : fromDate
      ? `${format(fromDate, 'dd/MM/yyyy')} — ...`
      : 'Selecionar datas';

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) setPicking(fromDate && !toDate ? 'end' : 'start'); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 bg-white dark:bg-dark-card border border-border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary-500 text-foreground text-sm whitespace-nowrap"
        >
          <Calendar size={16} className="text-muted-foreground shrink-0" />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => setViewMonth(subMonths(viewMonth, 1))}
              className="p-1 rounded hover:bg-muted dark:hover:bg-white/10"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium capitalize">
              {format(viewMonth, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() => setViewMonth(addMonths(viewMonth, 1))}
              className="p-1 rounded hover:bg-muted dark:hover:bg-white/10"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Hint */}
          <p className="text-xs text-muted-foreground text-center mb-2">
            {picking === 'start' ? 'Selecione a data inicial' : 'Selecione a data final'}
          </p>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-0 mb-1">
            {weekDays.map((d, i) => (
              <div key={i} className="text-center text-xs text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0">
            {days.map((day, i) => {
              const inMonth = isSameMonth(day, viewMonth);
              const inRange = isInRange(day);
              const start = isStart(day);
              const end = isEnd(day);

              return (
                <button
                  key={i}
                  type="button"
                  aria-label={format(day, "d 'de' MMMM", { locale: ptBR })}
                  onClick={() => handleDayClick(day)}
                  onMouseEnter={() => picking === 'end' && setHovered(day)}
                  onMouseLeave={() => setHovered(null)}
                  className={cn('h-8 w-8 text-xs rounded-md transition-colors',
 !inMonth && 'text-muted-foreground dark:text-secondary-foreground',
 inMonth && 'text-foreground hover:bg-muted dark:hover:bg-white/10',
 inRange && !start && !end && 'bg-primary-500/15 dark:bg-primary-500/20 rounded-none',
 (start || end) && 'bg-primary-500 text-white hover:bg-primary-600 dark:hover:bg-primary-400',
                    start && 'rounded-l-md rounded-r-none',
                    end && 'rounded-r-md rounded-l-none',
                    start && end && 'rounded-md',
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {/* Clear */}
          {(fromDate || toDate) && (
            <button
              type="button"
              onClick={() => { onChangeFrom(''); onChangeTo(''); setPicking('start'); }}
              className="mt-2 w-full text-xs text-muted-foreground hover:text-secondary-foreground dark:hover:text-muted-foreground"
            >
              Limpar datas
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
