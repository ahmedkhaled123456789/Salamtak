import { cn } from '../../utils/cn';

const palettes = [
'bg-brand-soft text-brand',
'bg-info-soft text-info',
'bg-success-soft text-success',
'bg-warning-soft text-warning',
'bg-subtle text-ink-2'];


const sizes = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-[12px]',
  lg: 'h-12 w-12 text-[15px]',
  xl: 'h-16 w-16 text-[19px]'
};

interface AvatarProps {
  name: string;
  size?: keyof typeof sizes;
  className?: string;
}

export function Avatar({ name, size = 'sm', className }: AvatarProps) {
  const initials = name.
  replace(/\(.*\)/, '').
  split(' ').
  filter(Boolean).
  slice(0, 2).
  map((part) => part[0]?.toUpperCase()).
  join('');
  const hash = Array.from(name).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ring-inset ring-line/60',
        palettes[hash % palettes.length],
        sizes[size],
        className
      )}>
      
      {initials}
    </span>);

}