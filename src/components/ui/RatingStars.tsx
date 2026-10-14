import { StarIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface RatingStarsProps {
  rating: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function RatingStars({ rating, size = 'sm', className }: RatingStarsProps) {
  const dims = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) =>
      <StarIcon
        key={i}
        className={cn(dims, i < Math.round(rating) ? 'fill-warning text-warning' : 'fill-line text-line')}
        strokeWidth={1.5}
        aria-hidden />

      )}
    </span>);

}