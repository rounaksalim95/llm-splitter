/**
 * Vitest Test Setup
 *
 * Configures the test environment with mocks for Chrome extension APIs
 */

import { vi, beforeEach, afterEach } from 'vitest';

/**
 * Mock chrome.storage API
 */
const mockStorage: Record<string, unknown> = {};

const storageMock = {
  local: {
    get: vi.fn((keys: string | string[]) => {
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: mockStorage[keys] });
      }
      const result: Record<string, unknown> = {};
      for (const key of keys) {
        result[key] = mockStorage[key];
      }
      return Promise.resolve(result);
    }),
    set: vi.fn((items: Record<string, unknown>) => {
      Object.assign(mockStorage, items);
      return Promise.resolve();
    }),
    remove: vi.fn((keys: string | string[]) => {
      const keysArray = typeof keys === 'string' ? [keys] : keys;
      for (const key of keysArray) {
        delete mockStorage[key];
      }
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
      return Promise.resolve();
    }),
  },
  sync: {
    get: vi.fn(() => Promise.resolve({})),
    set: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
  },
};

/**
 * Mock chrome.runtime API
 */
const runtimeMock = {
  sendMessage: vi.fn(() => Promise.resolve()),
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  openOptionsPage: vi.fn(),
  getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
  id: 'mock-extension-id',
};

/**
 * Mock chrome.windows API
 */
const windowsMock = {
  create: vi.fn((options) =>
    Promise.resolve({
      id: Math.floor(Math.random() * 10000),
      ...options,
    })
  ),
  update: vi.fn(() => Promise.resolve()),
  remove: vi.fn(() => Promise.resolve()),
  getAll: vi.fn(() => Promise.resolve([])),
};

/**
 * Mock chrome.system.display API
 */
const systemMock = {
  display: {
    getInfo: vi.fn(() =>
      Promise.resolve([
        {
          bounds: {
            width: 1920,
            height: 1080,
            left: 0,
            top: 0,
          },
        },
      ])
    ),
  },
};

/**
 * Mock chrome.tabs API
 */
const tabsMock = {
  query: vi.fn(() => Promise.resolve([])),
  create: vi.fn((options) =>
    Promise.resolve({
      id: Math.floor(Math.random() * 10000),
      ...options,
    })
  ),
  sendMessage: vi.fn(() => Promise.resolve()),
};

/**
 * Mock chrome.scripting API
 */
const scriptingMock = {
  executeScript: vi.fn(() => Promise.resolve()),
};

// Create the global chrome mock
const chromeMock = {
  storage: storageMock,
  runtime: runtimeMock,
  windows: windowsMock,
  system: systemMock,
  tabs: tabsMock,
  scripting: scriptingMock,
};

// Assign to global
(globalThis as unknown as { chrome: typeof chromeMock }).chrome = chromeMock;

/**
 * Helper to set storage data for tests
 */
export function setStorageData(data: Record<string, unknown>): void {
  Object.assign(mockStorage, data);
}

/**
 * Helper to clear storage data
 */
export function clearStorageData(): void {
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
}

/**
 * Helper to get current storage data
 */
export function getStorageData(): Record<string, unknown> {
  return { ...mockStorage };
}

/**
 * Reset mocks before each test
 */
beforeEach(() => {
  vi.clearAllMocks();
  clearStorageData();
});

/**
 * Clean up after each test
 */
afterEach(() => {
  document.body.innerHTML = '';
});
