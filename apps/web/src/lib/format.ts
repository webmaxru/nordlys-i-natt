import type { Verdict } from '@nordlys/shared';

export function verdictColor(verdict: Verdict): string {
  switch (verdict) {
    case 'GO':
      return 'var(--go)';
    case 'MAYBE':
      return 'var(--maybe)';
    case 'NO':
      return 'var(--no)';
  }
}

export function formatLocalHour(iso: string, locale?: string): string {
  return new Date(iso).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function kpColor(kp: number): string {
  if (kp >= 5) {
    return 'var(--go)';
  }

  if (kp >= 3) {
    return 'var(--maybe)';
  }

  return 'var(--no)';
}
