import React, { useEffect, useRef } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { XIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string;
  icon?: React.ReactNode;
}

export function Modal({ open, onClose, title, description, children, footer, widthClassName, icon }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => panelRef.current?.focus(), 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open &&
      <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <m.div
          className="absolute inset-0 bg-[#0b1322]/30 backdrop-blur-[1px] dark:bg-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose} />
        
          <m.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
          className={cn(
            'relative flex max-h-[92vh] w-full flex-col rounded-t-xl border border-line bg-elevated shadow-pop focus:outline-none sm:rounded-xl',
            widthClassName ?? 'sm:max-w-[480px]'
          )}>
          
            <header className="flex items-start gap-3 px-6 pb-2 pt-5">
              {icon}
              <div className="min-w-0 flex-1">
                <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
                {description && <p className="mt-1 text-[13px] leading-relaxed text-ink-3">{description}</p>}
              </div>
              <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="-mr-2 -mt-1 rounded-md p-1.5 text-ink-3 transition-colors hover:bg-subtle hover:text-ink">
              
                <XIcon className="h-4 w-4" />
              </button>
            </header>
            {children && <div className="overflow-y-auto px-6 py-3">{children}</div>}
            {footer && <footer className="flex items-center justify-end gap-2 px-6 pb-5 pt-3">{footer}</footer>}
          </m.div>
        </div>
      }
    </AnimatePresence>);

}