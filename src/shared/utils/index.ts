import type { ExtensionMessage, UserSettings } from '../types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../constants';

/**
 * Creates a typed extension message with timestamp
 */
export function createMessage<T>(
  type: ExtensionMessage['type'],
  payload?: T
): ExtensionMessage<T> {
  return {
    type,
    payload,
    timestamp: Date.now(),
  };
}

/**
 * Loads user settings from chrome.storage.local
 * Falls back to default settings if none exist
 */
export async function loadSettings(): Promise<UserSettings> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const stored = result[STORAGE_KEYS.SETTINGS];

    if (stored) {
      // Merge with defaults to handle any new settings added in updates
      return { ...DEFAULT_SETTINGS, ...stored };
    }

    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('[LLM Splitter] Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Saves user settings to chrome.storage.local
 */
export async function saveSettings(settings: UserSettings): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
  } catch (error) {
    console.error('[LLM Splitter] Failed to save settings:', error);
    throw error;
  }
}

/**
 * Waits for a condition to be true, with timeout
 */
export function waitFor(
  condition: () => boolean,
  timeout: number,
  interval: number = 100
): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const check = () => {
      if (condition()) {
        resolve(true);
        return;
      }

      if (Date.now() - startTime >= timeout) {
        resolve(false);
        return;
      }

      setTimeout(check, interval);
    };

    check();
  });
}

/**
 * Waits for an element matching a selector to appear in the DOM
 */
export function waitForElement(
  selector: string,
  timeout: number,
  root: Document | Element = document
): Promise<Element | null> {
  return new Promise((resolve) => {
    // Check if element already exists
    const existing = root.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    // Set up MutationObserver for robust detection
    const observer = new MutationObserver(() => {
      const element = root.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(root instanceof Document ? root.body : root, {
      childList: true,
      subtree: true,
    });

    // Timeout fallback
    setTimeout(() => {
      observer.disconnect();
      const element = root.querySelector(selector);
      resolve(element);
    }, timeout);
  });
}

/**
 * Debounces a function call
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Detects if the user prefers dark mode
 */
export function prefersDarkMode(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Gets the effective theme based on user settings
 */
export function getEffectiveTheme(theme: UserSettings['theme']): 'light' | 'dark' {
  if (theme === 'system') {
    return prefersDarkMode() ? 'dark' : 'light';
  }
  return theme;
}
