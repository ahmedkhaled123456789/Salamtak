import { cn } from '../../utils/cn';

interface SparklineProps {
  data: number[];
  height?: number;
  className?: string;
}

export function Sparkline({ data, height = 40, className }: SparklineProps) {
  if (data.length < 2) return null;
  const width = 160;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const points = data.map((v, i) => [i / (data.length - 1) * width, height - 3 - (v - min) / span * (height - 6)]);
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  const [lx, ly] = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={cn('w-full overflow-visible', className)} style={{ height }} aria-hidden>
      <path d={area} className="fill-brand/[0.07]" />
      <path d={line} className="fill-none stroke-brand" strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={2.5} className="fill-brand" />
    </svg>);

}