import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from 'framer-motion';
import { cn } from "../../utils/cn";
import type { LucideIcon } from "lucide-react";
export interface DropdownItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  separatorBefore?: boolean;
  disabled?: boolean;
}
interface DropdownProps {
  trigger: React.ReactNode;
  triggerClassName?: string;
  ariaLabel?: string;
  items?: DropdownItem[];
  header?: React.ReactNode;
  children?: React.ReactNode | ((close: () => void) => React.ReactNode);
  align?: 'left' | 'right';
  widthClassName?: string;
}
export function Dropdown({
  trigger,
  triggerClassName,
  ariaLabel,
  items,
  header,
  children,
  align = 'right',
  widthClassName
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const close = () => setOpen(false);
  return <div ref={ref} className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={ariaLabel} onClick={() => setOpen((o) => !o)} className={triggerClassName}>
        {trigger}
      </button>
      <AnimatePresence>
        {open && <m.div role="menu" initial={{
        opacity: 0,
        y: -4,
        scale: 0.98
      }} animate={{
        opacity: 1,
        y: 0,
        scale: 1
      }} exit={{
        opacity: 0,
        y: -4,
        scale: 0.98
      }} transition={{
        duration: 0.12,
        ease: 'easeOut'
      }} className={cn('absolute top-full z-50 mt-1.5 rounded-lg border border-line bg-elevated p-1 shadow-pop', align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left', widthClassName ?? 'w-52')}>
            {header}
            {items?.map((item) => {
          const Icon = item.icon;
          return <React.Fragment key={item.label}>
                  {item.separatorBefore && <div className="-mx-1 my-1 h-px bg-line" role="separator" />}
                  <button type="button" role="menuitem" disabled={item.disabled} onClick={() => {
              item.onSelect();
              close();
            }} className={cn('flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors disabled:opacity-40', item.danger ? 'text-danger hover:bg-danger-soft' : 'text-ink hover:bg-subtle')}>
                    {Icon && <Icon className={cn('h-3.5 w-3.5', item.danger ? 'text-danger' : 'text-ink-3')} aria-hidden />}
                    {item.label}
                  </button>
                </React.Fragment>;
        })}
            {typeof children === 'function' ? children(close) : children}
          </m.div>}
      </AnimatePresence>
    </div>;
}