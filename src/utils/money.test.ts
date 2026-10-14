import { describe, expect, it } from 'vitest';
import { formatBps, formatFils, parseAedToFils, parsePercentToBps } from './money';
import { rangeToQuery } from './dateRange';

describe('money formatting (display only, integer fils)', () => {
  it('formats fils as AED', () => {
    expect(formatFils(0)).toBe('AED 0.00');
    expect(formatFils(5)).toBe('AED 0.05');
    expect(formatFils(123456)).toBe('AED 1,234.56');
    expect(formatFils(-250, { sign: true })).toBe('−AED 2.50');
    expect(formatFils(250, { sign: true })).toBe('+AED 2.50');
  });

  it('parses AED input with string math (no float drift)', () => {
    expect(parseAedToFils('0.1')).toBe(10);
    expect(parseAedToFils('19.99')).toBe(1999);
    expect(parseAedToFils('1,250.5')).toBe(125050);
    expect(parseAedToFils('1.005')).toBeNull();
    expect(parseAedToFils('-5')).toBeNull();
    expect(parseAedToFils('abc')).toBeNull();
  });

  it('parses percentages into basis points', () => {
    expect(parsePercentToBps('15')).toBe(1500);
    expect(parsePercentToBps('12.5')).toBe(1250);
    expect(parsePercentToBps('0.01')).toBe(1);
    expect(parsePercentToBps('100')).toBe(10000);
    expect(parsePercentToBps('100.01')).toBeNull();
    expect(parsePercentToBps('0')).toBeNull();
    expect(formatBps(1250)).toBe('12.5%');
  });
});

describe('date range → query', () => {
  const now = new Date('2026-10-09T12:00:00');
  it('returns nothing for "all time"', () => expect(rangeToQuery({ preset: 'all' }, now)).toEqual({}));
  it('builds a 7-day window ending today', () => {
    const q = rangeToQuery({ preset: '7d' }, now);
    expect(new Date(q.from!).getTime()).toBeLessThan(new Date(q.to!).getTime());
  });
  it('ignores an inverted custom range', () => expect(rangeToQuery({ preset: 'custom', from: '2026-10-10', to: '2026-10-01' }, now)).toEqual({}));
  it('accepts a valid custom range', () => {
    const q = rangeToQuery({ preset: 'custom', from: '2026-10-01', to: '2026-10-05' }, now);
    expect(q.from && q.to).toBeTruthy();
  });
});
