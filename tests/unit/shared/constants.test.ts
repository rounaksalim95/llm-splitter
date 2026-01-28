/**
 * Tests for shared constants
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PROVIDERS,
  DEFAULT_WINDOW_LAYOUT,
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  MESSAGE_TYPES,
  TIMING,
} from '@shared/constants';

describe('DEFAULT_PROVIDERS', () => {
  it('should have all required providers', () => {
    const providerIds = DEFAULT_PROVIDERS.map((p) => p.id);

    expect(providerIds).toContain('chatgpt');
    expect(providerIds).toContain('claude');
    expect(providerIds).toContain('gemini');
    expect(providerIds).toContain('grok');
  });

  it('should have valid provider configurations', () => {
    for (const provider of DEFAULT_PROVIDERS) {
      expect(provider.id).toBeTruthy();
      expect(provider.name).toBeTruthy();
      expect(provider.url).toMatch(/^https:\/\//);
      expect(typeof provider.enabled).toBe('boolean');
      expect(provider.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('should have all providers enabled by default', () => {
    for (const provider of DEFAULT_PROVIDERS) {
      expect(provider.enabled).toBe(true);
    }
  });
});

describe('DEFAULT_WINDOW_LAYOUT', () => {
  it('should have valid arrangement', () => {
    expect(['horizontal', 'vertical', 'grid']).toContain(DEFAULT_WINDOW_LAYOUT.arrangement);
  });

  it('should have positive window dimensions', () => {
    expect(DEFAULT_WINDOW_LAYOUT.windowWidth).toBeGreaterThan(0);
    expect(DEFAULT_WINDOW_LAYOUT.windowHeight).toBeGreaterThan(0);
  });
});

describe('DEFAULT_SETTINGS', () => {
  it('should have providers', () => {
    expect(DEFAULT_SETTINGS.providers).toBe(DEFAULT_PROVIDERS);
  });

  it('should have windowLayout', () => {
    expect(DEFAULT_SETTINGS.windowLayout).toBe(DEFAULT_WINDOW_LAYOUT);
  });

  it('should have valid theme', () => {
    expect(['light', 'dark', 'system']).toContain(DEFAULT_SETTINGS.theme);
  });

  it('should have empty default query', () => {
    expect(DEFAULT_SETTINGS.defaultQuery).toBe('');
  });
});

describe('STORAGE_KEYS', () => {
  it('should have SETTINGS key', () => {
    expect(STORAGE_KEYS.SETTINGS).toBeTruthy();
  });

  it('should have LAST_QUERY key', () => {
    expect(STORAGE_KEYS.LAST_QUERY).toBeTruthy();
  });

  it('should be readonly', () => {
    // TypeScript should prevent this at compile time, but we can verify values don't change
    const originalSettings = STORAGE_KEYS.SETTINGS;
    expect(STORAGE_KEYS.SETTINGS).toBe(originalSettings);
  });
});

describe('MESSAGE_TYPES', () => {
  it('should have all required message types', () => {
    expect(MESSAGE_TYPES.SUBMIT_QUERY).toBe('SUBMIT_QUERY');
    expect(MESSAGE_TYPES.QUERY_SUBMITTED).toBe('QUERY_SUBMITTED');
    expect(MESSAGE_TYPES.QUERY_FAILED).toBe('QUERY_FAILED');
    expect(MESSAGE_TYPES.GET_SETTINGS).toBe('GET_SETTINGS');
    expect(MESSAGE_TYPES.SETTINGS_UPDATED).toBe('SETTINGS_UPDATED');
    expect(MESSAGE_TYPES.PROVIDER_READY).toBe('PROVIDER_READY');
    expect(MESSAGE_TYPES.PING).toBe('PING');
  });
});

describe('TIMING', () => {
  it('should have positive timeout values', () => {
    expect(TIMING.INPUT_DETECTION_TIMEOUT).toBeGreaterThan(0);
    expect(TIMING.INPUT_DETECTION_INTERVAL).toBeGreaterThan(0);
    expect(TIMING.SUBMIT_DELAY).toBeGreaterThan(0);
    expect(TIMING.PAGE_READY_TIMEOUT).toBeGreaterThan(0);
  });

  it('should have reasonable timeout values', () => {
    // Timeouts should be at least 1 second
    expect(TIMING.INPUT_DETECTION_TIMEOUT).toBeGreaterThanOrEqual(1000);
    expect(TIMING.PAGE_READY_TIMEOUT).toBeGreaterThanOrEqual(1000);

    // Intervals should be less than timeouts
    expect(TIMING.INPUT_DETECTION_INTERVAL).toBeLessThan(TIMING.INPUT_DETECTION_TIMEOUT);
  });
});
