import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, m } from 'framer-motion';
import { CornerDownLeftIcon, SearchIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { visibleSections } from "../../config/navigation";
import { useSession } from "../../contexts/SessionContext";
import { cn } from "../../utils/cn";
interface CommandItem {
  id: string;
  group: string;
  label: string;
  sublabel?: string;
  to: string;
  icon: LucideIcon;
}
interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}
export function CommandPalette({
  open,
  onClose
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { can } = useSession();

  // The backend has no global search endpoint, so this palette only jumps between the pages the current
  // role can open. It never searches (or holds) bookings, patients or payments.
  const index = useMemo<CommandItem[]>(
    () =>
      visibleSections(can).flatMap((s) =>
        s.items.map((i) => ({ id: `page-${i.path}`, group: 'Pages', label: i.label, sublabel: s.label, to: i.path, icon: i.icon }))
      ),
    [can]
  );
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return index;
    const tokens = q.split(/\s+/);
    const matched = index.filter((i) => {
      const haystack = `${i.label} ${i.sublabel ?? ''} ${i.group}`.toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    });
    const perGroup: Record<string, number> = {};
    return matched.filter((i) => {
      perGroup[i.group] = (perGroup[i.group] ?? 0) + 1;
      return perGroup[i.group] <= 5;
    });
  }, [index, query]);
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);
  useEffect(() => setActiveIndex(0), [query]);
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({
      block: 'nearest'
    });
  }, [activeIndex]);
  const select = (item: CommandItem) => {
    navigate(item.to);
    onClose();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      select(results[activeIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };
  const groups = results.reduce<{
    group: string;
    items: {
      item: CommandItem;
      index: number;
    }[];
  }[]>((acc, item, index) => {
    const label = !query.trim() ? 'Jump to' : item.group;
    const existing = acc.find((g) => g.group === label);
    if (existing) existing.items.push({
      item,
      index
    });else acc.push({
      group: label,
      items: [{
        item,
        index
      }]
    });
    return acc;
  }, []);
  return <AnimatePresence>
      {open && <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[10vh]">
          <m.div className="absolute inset-0 bg-[#0b1322]/30 backdrop-blur-[2px] dark:bg-black/60" initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} transition={{
        duration: 0.12
      }} onClick={onClose} />
          <m.div role="dialog" aria-modal="true" aria-label="Search" initial={{
        opacity: 0,
        y: -8,
        scale: 0.985
      }} animate={{
        opacity: 1,
        y: 0,
        scale: 1
      }} exit={{
        opacity: 0,
        y: -6,
        scale: 0.985
      }} transition={{
        duration: 0.15,
        ease: [0.2, 0.8, 0.2, 1]
      }} className="relative w-full max-w-[620px] overflow-hidden rounded-xl border border-line bg-elevated shadow-pop" onKeyDown={onKeyDown}>
            <div className="flex items-center gap-3 border-b border-line px-4">
              <SearchIcon className="h-4 w-4 text-ink-3" aria-hidden />
              <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Jump to a page…" aria-label="Jump to a page" role="combobox" aria-expanded="true" aria-controls="command-results" className="h-12 flex-1 bg-transparent text-[14px] text-ink placeholder:text-ink-3 focus:outline-none" />
              <kbd className="rounded border border-line px-1.5 py-0.5 text-[10.5px] font-medium text-ink-3">ESC</kbd>
            </div>
            <div ref={listRef} id="command-results" role="listbox" className="max-h-[400px] overflow-y-auto p-1.5">
              {groups.length === 0 ? <div className="px-4 py-10 text-center">
                  <p className="text-[13px] font-medium text-ink">No results for “{query}”</p>
                  <p className="mt-1 text-[12px] text-ink-3">Search matches page names only.</p>
                </div> : groups.map((g) => <div key={g.group} className="mb-1">
                    <p className="px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">{g.group}</p>
                    {g.items.map(({
              item,
              index
            }) => <button key={item.id} type="button" role="option" aria-selected={index === activeIndex} data-index={index} onMouseMove={() => setActiveIndex(index)} onClick={() => select(item)} className={cn('flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors', index === activeIndex ? 'bg-subtle' : '')}>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-surface">
                          <item.icon className="h-3.5 w-3.5 text-ink-2" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-ink">{item.label}</span>
                          {item.sublabel && <span className="block truncate text-[11.5px] text-ink-3">{item.sublabel}</span>}
                        </span>
                        {index === activeIndex && <CornerDownLeftIcon className="h-3.5 w-3.5 text-ink-3" aria-hidden />}
                      </button>)}
                  </div>)}
            </div>
            <div className="flex items-center gap-4 border-t border-line bg-surface px-4 py-2 text-[11px] text-ink-3">
              <span><kbd className="font-sans">↑↓</kbd> navigate</span>
              <span><kbd className="font-sans">↵</kbd> open</span>
              <span className="ml-auto">Only pages your role can open</span>
            </div>
          </m.div>
        </div>}
    </AnimatePresence>;
}