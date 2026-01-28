/**
 * Tests for shared utility functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMessage,
  loadSettings,
  saveSettings,
  waitFor,
  waitForElement,
  debounce,
  prefersDarkMode,
  getEffectiveTheme,
} from '@shared/utils';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '@shared/constants';
import { setStorageData, clearStorageData } from '../../setup';

describe('createMessage', () => {
  it('should create a message with the correct type', () => {
    const message = createMessage('SUBMIT_QUERY', { query: 'test' });

    expect(message.type).toBe('SUBMIT_QUERY');
    expect(message.payload).toEqual({ query: 'test' });
    expect(message.timestamp).toBeTypeOf('number');
  });

  it('should create a message without payload', () => {
    const message = createMessage('PING');

    expect(message.type).toBe('PING');
    expect(message.payload).toBeUndefined();
    expect(message.timestamp).toBeTypeOf('number');
  });

  it('should use current timestamp', () => {
    const before = Date.now();
    const message = createMessage('PING');
    const after = Date.now();

    expect(message.timestamp).toBeGreaterThanOrEqual(before);
    expect(message.timestamp).toBeLessThanOrEqual(after);
  });
});

describe('loadSettings', () => {
  beforeEach(() => {
    clearStorageData();
  });

  it('should return default settings when no settings are stored', async () => {
    const settings = await loadSettings();

    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('should return stored settings when available', async () => {
    const customSettings = {
      ...DEFAULT_SETTINGS,
      theme: 'dark' as const,
    };
    setStorageData({ [STORAGE_KEYS.SETTINGS]: customSettings });

    const settings = await loadSettings();

    expect(settings.theme).toBe('dark');
  });

  it('should merge stored settings with defaults for new properties', async () => {
    const partialSettings = {
      theme: 'dark' as const,
    };
    setStorageData({ [STORAGE_KEYS.SETTINGS]: partialSettings });

    const settings = await loadSettings();

    expect(settings.theme).toBe('dark');
    expect(settings.providers).toEqual(DEFAULT_SETTINGS.providers);
    expect(settings.windowLayout).toEqual(DEFAULT_SETTINGS.windowLayout);
  });
});

describe('saveSettings', () => {
  beforeEach(() => {
    clearStorageData();
  });

  it('should save settings to storage', async () => {
    const customSettings = {
      ...DEFAULT_SETTINGS,
      theme: 'dark' as const,
    };

    await saveSettings(customSettings);

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [STORAGE_KEYS.SETTINGS]: customSettings,
    });
  });
});

describe('waitFor', () => {
  it('should resolve true when condition becomes true', async () => {
    let flag = false;
    setTimeout(() => {
      flag = true;
    }, 50);

    const result = await waitFor(() => flag, 1000, 10);

    expect(result).toBe(true);
  });

  it('should resolve false on timeout', async () => {
    const result = await waitFor(() => false, 100, 10);

    expect(result).toBe(false);
  });

  it('should resolve true immediately if condition is already true', async () => {
    const result = await waitFor(() => true, 1000);

    expect(result).toBe(true);
  });
});

describe('waitForElement', () => {
  it('should return element if it already exists', async () => {
    const div = document.createElement('div');
    div.id = 'test-element';
    document.body.appendChild(div);

    const result = await waitForElement('#test-element', 1000);

    expect(result).toBe(div);
  });

  it('should wait for element to appear', async () => {
    setTimeout(() => {
      const div = document.createElement('div');
      div.id = 'delayed-element';
      document.body.appendChild(div);
    }, 50);

    const result = await waitForElement('#delayed-element', 1000);

    expect(result).not.toBeNull();
    expect(result?.id).toBe('delayed-element');
  });

  it('should return null on timeout', async () => {
    const result = await waitForElement('#non-existent', 100);

    expect(result).toBeNull();
  });
});

describe('debounce', () => {
  it('should debounce function calls', async () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);

    debounced();
    debounced();
    debounced();

    expect(fn).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments to debounced function', async () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);

    debounced('arg1', 'arg2');

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('prefersDarkMode', () => {
  it('should return boolean based on media query', () => {
    const result = prefersDarkMode();

    expect(typeof result).toBe('boolean');
  });
});

describe('getEffectiveTheme', () => {
  it('should return light when theme is light', () => {
    const result = getEffectiveTheme('light');
    expect(result).toBe('light');
  });

  it('should return dark when theme is dark', () => {
    const result = getEffectiveTheme('dark');
    expect(result).toBe('dark');
  });

  it('should return system preference when theme is system', () => {
    const result = getEffectiveTheme('system');
    expect(['light', 'dark']).toContain(result);
  });
});
