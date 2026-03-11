import React, { useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FocusTrap, useFocusReturn } from '@/lib/a11y';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}

export function Drawer({ isOpen, onClose, children, ariaLabel, className }: DrawerProps) {
  useFocusReturn({ enabled: isOpen });

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); },
    [onClose]
  );
  const handleEscape = useCallback(() => onClose(), [onClose]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <FocusTrap active={isOpen} onEscape={handleEscape} returnFocus={true}>
          <motion.div
            className="fixed inset-0 z-[var(--z-modal)] bg-background/70 backdrop-blur-sm md:left-[var(--app-sidebar-width,0px)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={handleBackdropClick}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={ariaLabel}
              className={cn(
                'absolute top-0 right-0 bottom-0 w-80 max-w-full',
                'bg-white dark:bg-dark-card border-l border-border shadow-2xl overflow-y-auto',
                'pb-[var(--app-safe-area-bottom,0px)]',
                className
              )}
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.22 }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {children}
            </motion.div>
          </motion.div>
        </FocusTrap>
      ) : null}
    </AnimatePresence>
  );
}
