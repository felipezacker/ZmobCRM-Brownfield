import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

// Map Tailwind bg-color classes to CSS chart tokens (TD-3.1 UX-009)
const colorToToken: Record<string, string> = {
    'bg-blue-500': 'var(--chart-blue)',
    'bg-purple-500': 'var(--chart-purple)',
    'bg-emerald-500': 'var(--chart-emerald)',
    'bg-orange-500': 'var(--chart-orange)',
    'bg-green-500': 'var(--chart-green)',
    'bg-red-500': 'var(--chart-red)',
    'bg-yellow-500': 'var(--chart-yellow)',
    'bg-cyan-500': 'var(--chart-cyan)',
    'bg-pink-500': 'var(--chart-pink)',
    'bg-indigo-500': 'var(--chart-indigo)',
    'bg-teal-500': 'var(--chart-teal)',
    'bg-amber-500': 'var(--chart-amber)',
};

interface StatCardProps {
    title: string;
    value: string;
    subtext: string;
    subtextPositive?: boolean;
    icon: React.ElementType;
    color: string;
    onClick?: () => void;
    comparisonLabel?: string;
}

/**
 * Componente React `StatCard`.
 *
 * @param {StatCardProps} {
    title,
    value,
    subtext,
    subtextPositive = true,
    icon: Icon,
    color,
    onClick,
    comparisonLabel = 'vs período anterior'
} - Parâmetro `{
    title,
    value,
    subtext,
    subtextPositive = true,
    icon: Icon,
    color,
    onClick,
    comparisonLabel = 'vs período anterior'
}`.
 * @returns {Element} Retorna um valor do tipo `Element`.
 */
export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    subtext,
    subtextPositive = true,
    icon: Icon,
    color,
    onClick,
    comparisonLabel = 'vs período anterior'
}) => {
    const TrendIcon = subtextPositive ? TrendingUp : TrendingDown;
    const trendColorClass = subtextPositive
        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
        : 'bg-red-500/10 text-red-600 dark:text-red-400';

    // Get CSS token for inline styles (adapts to light/dark automatically)
    const chartColor = colorToToken[color] || 'var(--chart-blue)';

    return (
        <div
            onClick={onClick}
            className={`glass p-6 rounded-xl border border-border  shadow-sm relative overflow-hidden group ${onClick ? 'cursor-pointer hover:border-primary-500/50 transition-colors' : ''}`}
        >
            <div className={`absolute top-0 right-0 p-20 rounded-full blur-3xl opacity-10 -mr-10 -mt-10 transition-opacity group-hover:opacity-20 ${color}`}></div>

            <div className="flex justify-between items-start relative z-10">
                <div>
                    <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground mb-1 font-display">{title}</p>
                    <p className="text-3xl font-bold text-foreground font-display tracking-tight">{value}</p>
                </div>
                <div
                    className="p-3 rounded-xl ring-1 ring-inset ring-white/10"
                    style={{
                        backgroundColor: `color-mix(in oklch, ${chartColor} 15%, transparent)`,
                    }}
                >
                    <Icon
                        size={20}
                        color={chartColor}
                        strokeWidth={2}
                    />
                </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1 relative z-10">
                <span className={`${trendColorClass} px-1.5 py-0.5 rounded text-xs font-bold flex items-center gap-1`}>
                    <TrendIcon size={10} strokeWidth={2} /> {subtext}
                </span>
                <span className="ml-1 dark:text-muted-foreground">{comparisonLabel}</span>
            </p>
        </div>
    );
};
