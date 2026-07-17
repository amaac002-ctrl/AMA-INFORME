import { describe, it, expect } from 'vitest';
import { cn } from '@/src/lib/utils';

describe('cn', () => {
  it('joins multiple class name strings', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('ignores falsy values', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('supports conditional object syntax', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });

  it('flattens array inputs', () => {
    expect(cn(['a', 'b'], 'c')).toBe('a b c');
  });

  it('merges conflicting tailwind utilities keeping the last one', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('keeps non-conflicting tailwind utilities', () => {
    expect(cn('px-2', 'py-4')).toBe('px-2 py-4');
  });

  it('returns an empty string when given no arguments', () => {
    expect(cn()).toBe('');
  });
});
