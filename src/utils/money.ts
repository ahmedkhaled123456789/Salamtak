/**
 * Money is stored by the backend as integer fils (1 AED = 100 fils).
 * These helpers are DISPLAY-ONLY. Never use them for business calculations,
 * and never compute authoritative commission on the frontend.
 */

interface FormatOptions {
  currency?: boolean;
  decimals?: boolean;
  sign?: boolean;
}

export function formatFils(fils: number, options: FormatOptions = {}): string {
  const { currency = true, decimals = true, sign = false } = options;
  const value = Math.trunc(fils);
  const negative = value < 0;
  const abs = Math.abs(value);
  const major = Math.floor(abs / 100);
  const minor = abs % 100;
  const majorText = major.toLocaleString('en-US');
  const body = decimals ? `${majorText}.${String(minor).padStart(2, '0')}` : majorText;
  const prefix = negative ? '−' : sign && value > 0 ? '+' : '';
  return `${prefix}${currency ? 'AED ' : ''}${body}`;
}

/** Compact axis label, e.g. 1840000 fils → "18.4K". Display only. */
export function formatFilsCompact(fils: number): string {
  const aed = Math.floor(Math.abs(fils) / 100);
  if (aed >= 1_000_000) return `${(aed / 1_000_000).toFixed(1)}M`;
  if (aed >= 10_000) return `${Math.round(aed / 1000)}K`;
  if (aed >= 1000) return `${(aed / 1000).toFixed(1)}K`;
  return String(aed);
}

/** Basis points → percent label. 1500 → "15%", 1250 → "12.5%". */
export function formatBps(bps: number): string {
  const whole = Math.floor(bps / 100);
  const fraction = bps % 100;
  if (fraction === 0) return `${whole}%`;
  return `${whole}.${String(fraction).padStart(2, '0').replace(/0$/, '')}%`;
}

/**
 * Parse a user-entered AED amount ("750", "1,250.5") into integer fils using string math only.
 * Returns null for invalid input. The backend re-validates every amount.
 */
export function parseAedToFils(input: string): number | null {
  const cleaned = input.replace(/,/g, '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [major, minor = ''] = cleaned.split('.');
  return Number(major) * 100 + Number(minor.padEnd(2, '0'));
}

export function splitFils(fils: number): {major: string;minor: string;} {
  const abs = Math.abs(Math.trunc(fils));
  return {
    major: Math.floor(abs / 100).toLocaleString('en-US'),
    minor: String(abs % 100).padStart(2, '0')
  };
}
/**
 * Parse a user-entered percentage ("15", "12.5", "7.25") into basis points (1500, 1250, 725) with string
 * math only. Returns null for invalid input or anything outside 0.01%–100%. The backend re-validates.
 */
export function parsePercentToBps(input: string): number | null {
  const cleaned = input.trim();
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ''] = cleaned.split('.');
  const bps = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return bps >= 1 && bps <= 10_000 ? bps : null;
}
