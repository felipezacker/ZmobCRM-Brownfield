import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { prefetchRoute, RouteName } from '@/lib/prefetch';

interface NavItemProps {
  to: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  prefetch?: RouteName;
  clickedPath?: string;
  onItemClick?: (path: string) => void;
}

export const NavItem: React.FC<NavItemProps> = ({
  to,
  icon: Icon,
  label,
  prefetch,
  clickedPath,
  onItemClick,
}) => {
  const pathname = usePathname();
  const isActive = pathname === to || (to === '/boards' && pathname === '/pipeline');
  const wasJustClicked = clickedPath === to;

  const anotherItemWasClicked = clickedPath && clickedPath !== to;
  const isActuallyActive = anotherItemWasClicked ? false : (isActive || wasJustClicked);

  return (
    <Link
      href={to}
      onMouseEnter={prefetch ? () => prefetchRoute(prefetch) : undefined}
      onFocus={prefetch ? () => prefetchRoute(prefetch) : undefined}
      onClick={() => onItemClick?.(to)}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium focus-visible-ring
    ${isActuallyActive
          ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-900/50'
          : 'text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/5 hover:text-foreground dark:hover:text-white'
        }`}
    >
      <Icon size={20} className={isActuallyActive ? 'text-primary-500' : ''} aria-hidden="true" />
      <span className="font-display tracking-wide">{label}</span>
    </Link>
  );
};
