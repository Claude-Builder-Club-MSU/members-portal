import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('utils', () => {
  describe('cn (className merger)', () => {
    it('merges class names correctly', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('handles conditional classes', () => {
      const includeBar = false;
      expect(cn('foo', includeBar && 'bar', 'baz')).toBe('foo baz');
    });

    it('merges Tailwind classes correctly (no duplicates)', () => {
      expect(cn('p-4', 'p-2')).toBe('p-2');
    });

    it('handles empty inputs', () => {
      expect(cn()).toBe('');
    });

    it('handles undefined and null', () => {
      expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
    });
  });
});