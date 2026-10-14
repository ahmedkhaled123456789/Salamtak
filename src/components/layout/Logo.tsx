import { cn } from '../../utils/cn';

interface LogoProps {
  compact?: boolean;
  /** `light` for use on dark or photographic backgrounds. */
  tone?: 'default' | 'light';
  className?: string;
}

/** Salamtak mark (brand/salamtak-icon.svg): a roof over a heart with a care cross, on a teal tile. */
function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" className={className} aria-hidden>
      <defs>
        <linearGradient id="salamtak-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14857B" />
          <stop offset="1" stopColor="#0B3F3B" />
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="64" fill="url(#salamtak-tile)" />
      <path d="M54 116 128 54l74 62" fill="none" stroke="#DDF5EC" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(128 166) scale(0.86) translate(-128 -156)">
        <path d="M128 204c-30-19-56-40-56-66 0-17 12-29 27-29 12 0 22 7 29 18 7-11 17-18 29-18 15 0 27 12 27 29 0 26-26 47-56 66z" fill="#FFFFFF" />
        <path d="M128 132v34M111 149h34" stroke="#D9694A" strokeWidth="11" strokeLinecap="round" />
      </g>
    </svg>);

}

export function Logo({ compact = false, tone = 'default', className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)} aria-label="Salamtak">
      <LogoMark className="h-8 w-8 shrink-0" />
      {!compact &&
      <span className="flex min-w-0 flex-col leading-tight" aria-hidden>
          <span lang="ar" className={cn('text-[17px] font-bold leading-none', tone === 'light' ? 'text-white' : 'text-ink')} style={{ fontFamily: "'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif" }}>
            سلامتك
          </span>
          <span className={cn('mt-1 text-[10.5px]', tone === 'light' ? 'text-white/70' : 'text-ink-3')}>Salamtak · Home Care Platform</span>
        </span>
      }
    </div>);

}
