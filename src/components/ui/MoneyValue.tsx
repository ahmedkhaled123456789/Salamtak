import { splitFils } from '../../utils/money';
import { cn } from '../../utils/cn';

interface MoneyValueProps {
  fils: number;
  decimals?: boolean;
  className?: string;
}

/** Large, legible money display: small "AED" prefix, tabular figures, muted minor units. */
export function MoneyValue({ fils, decimals = false, className }: MoneyValueProps) {
  const { major, minor } = splitFils(fils);
  return (
    <span className={cn('num inline-flex items-baseline', className)}>
      <span className="mr-1.5 text-[0.5em] font-medium tracking-normal text-ink-3">AED</span>
      <span>{major}</span>
      {decimals && <span className="text-ink-3">.{minor}</span>}
    </span>);

}