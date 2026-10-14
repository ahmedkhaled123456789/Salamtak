import React, { useEffect, useRef } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { XIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  widthClassName?: string;
}

export function Drawer({ open, onClose, title, eyebrow, subtitle, badge, footer, children, widthClassName }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => panelRef.current?.focus(), 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
      clearTimeout(t);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open &&
      <div className="fixed inset-0 z-50">
          <m.div
          className="absolute inset-0 bg-[#0b1322]/25 backdrop-blur-[1px] dark:bg-black/55"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose} />
        
          <m.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          initial={{ x: 32, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 32, opacity: 0 }}
          transition={{ type: 'spring', damping: 32, stiffness: 380, mass: 0.8 }}
          className={cn(
            'absolute right-0 top-0 flex h-full w-full flex-col border-l border-line bg-surface shadow-pop focus:outline-none',
            widthClassName ?? 'max-w-[560px]'
          )}>
          
            <header className="flex items-start gap-3 border-b border-line px-6 py-4">
              <div className="min-w-0 flex-1">
                {eyebrow && <div className="mb-1 text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-3">{eyebrow}</div>}
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-[17px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
                  {badge}
                </div>
                {subtitle && <p className="mt-1 text-[13px] text-ink-3">{subtitle}</p>}
              </div>
              <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="-mr-1.5 rounded-md p-1.5 text-ink-3 transition-colors hover:bg-subtle hover:text-ink">
              
                <XIcon className="h-4 w-4" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <footer className="flex items-center justify-end gap-2 border-t border-line bg-surface px-6 py-3">{footer}</footer>}
          </m.div>
        </div>
      }
    </AnimatePresence>);

}