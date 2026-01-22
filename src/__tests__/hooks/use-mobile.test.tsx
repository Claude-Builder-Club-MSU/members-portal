import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '@/hooks/use-mobile';

describe('useIsMobile', () => {
  beforeEach(() => {
    // Set default window size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  it('returns true when width is less than 900px', () => {
    // Set window width to mobile size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800,
    });

    const { result } = renderHook(() => useIsMobile());

    // Initially might be undefined, wait for state to settle
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(true);
  });

  it('returns false when width is 900px or more', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    });

    const { result } = renderHook(() => useIsMobile());

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(false);
  });

  it('returns false at exactly 900px', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 900,
    });

    const { result } = renderHook(() => useIsMobile());

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(false);
  });
});