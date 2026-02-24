import React from 'react';
import { Button } from '@/app/components/ui/Button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Reusable EmptyState component for displaying empty list/panel states.
 *
 * - size="sm": compact (py-4), text-sm only, no icon
 * - size="md": moderate (py-8), text-sm, optional icon (w-10 h-10)
 * - size="lg": generous (py-16), text-lg title, icon (w-16 h-16), optional action button
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  size = 'md',
  className,
}) => {
  const showIcon = icon && size !== 'sm';

  return (
    <div
      role="status"
      aria-label={title}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        size === 'sm' && 'py-4',
        size === 'md' && 'py-8',
        size === 'lg' && 'py-8 md:py-16',
        className,
      )}
    >
      {showIcon && (
        <div
          className={cn(
            'inline-flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 mb-4',
            size === 'md' && 'w-10 h-10',
            size === 'lg' && 'w-16 h-16',
          )}
        >
          {icon}
        </div>
      )}

      <p
        className={cn(
          'font-medium text-slate-700 dark:text-slate-200',
          size === 'lg' ? 'text-lg' : 'text-sm',
        )}
      >
        {title}
      </p>

      {description && (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          {description}
        </p>
      )}

      {action && size === 'lg' && (
        <Button
          onClick={action.onClick}
          disabled={action.disabled}
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};
