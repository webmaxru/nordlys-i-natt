import { describe, expect, it } from 'vitest';
import { isInQuietWindow } from './evaluate';

describe('isInQuietWindow', () => {
  it('matches a normal window [2,6)', () => {
    expect(isInQuietWindow(1, 2, 6)).toBe(false);
    expect(isInQuietWindow(2, 2, 6)).toBe(true);
    expect(isInQuietWindow(5, 2, 6)).toBe(true);
    expect(isInQuietWindow(6, 2, 6)).toBe(false); // end is exclusive
    expect(isInQuietWindow(20, 2, 6)).toBe(false);
  });

  it('supports windows that wrap past midnight [22,6)', () => {
    expect(isInQuietWindow(23, 22, 6)).toBe(true);
    expect(isInQuietWindow(0, 22, 6)).toBe(true);
    expect(isInQuietWindow(5, 22, 6)).toBe(true);
    expect(isInQuietWindow(6, 22, 6)).toBe(false);
    expect(isInQuietWindow(12, 22, 6)).toBe(false);
  });

  it('is disabled when start === end', () => {
    expect(isInQuietWindow(3, 0, 0)).toBe(false);
    expect(isInQuietWindow(3, 6, 6)).toBe(false);
  });
});
