// Mock Chrome storage data
let mockStorageData: Record<string, unknown> = {};

// Mock Chrome storage API
export const mockChromeStorage = {
  local: {
    get: vi.fn((keys: string | string[] | null) => {
      return new Promise((resolve) => {
        if (keys === null) {
          resolve(mockStorageData);
        } else if (typeof keys === 'string') {
          resolve({ [keys]: mockStorageData[keys] });
        } else if (Array.isArray(keys)) {
          const result: Record<string, unknown> = {};
          keys.forEach((key) => {
            if (key in mockStorageData) {
              result[key] = mockStorageData[key];
            }
          });
          resolve(result);
        } else {
          resolve({});
        }
      });
    }),
    set: vi.fn((items: Record<string, unknown>) => {
      return new Promise<void>((resolve) => {
        Object.assign(mockStorageData, items);
        resolve();
      });
    }),
    remove: vi.fn((keys: string | string[]) => {
      return new Promise<void>((resolve) => {
        const keysArray = Array.isArray(keys) ? keys : [keys];
        keysArray.forEach((key) => {
          delete mockStorageData[key];
        });
        resolve();
      });
    }),
    clear: vi.fn(() => {
      return new Promise<void>((resolve) => {
        mockStorageData = {};
        resolve();
      });
    }),
  },
  sync: {
    get: vi.fn(() => Promise.resolve({})),
    set: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
  },
};

// Mock Chrome runtime API
export const mockChromeRuntime = {
  sendMessage: vi.fn(() => Promise.resolve()),
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(() => false),
  },
  getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
  lastError: null as chrome.runtime.LastError | null,
};

// Mock Chrome commands API
export const mockChromeCommands = {
  onCommand: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(() => false),
  },
};

// Mock Chrome windows API
export const mockChromeWindows = {
  create: vi.fn(() =>
    Promise.resolve({
      id: 1,
      tabs: [{ id: 1, status: 'complete' }],
    })
  ),
  update: vi.fn(() => Promise.resolve()),
  remove: vi.fn(() => Promise.resolve()),
  getCurrent: vi.fn(() =>
    Promise.resolve({
      id: 1,
      left: 0,
      top: 0,
      width: 1920,
      height: 1080,
    })
  ),
};

// Mock Chrome tabs API
export const mockChromeTabs = {
  create: vi.fn(() => Promise.resolve({ id: 1 })),
  query: vi.fn(() => Promise.resolve([])),
  update: vi.fn(() => Promise.resolve()),
  sendMessage: vi.fn((tabId: number, message: { type: string }) => {
    // Handle PING messages by returning PONG
    if (message.type === 'PING') {
      return Promise.resolve({ type: 'PONG' });
    }
    return Promise.resolve({ success: true });
  }),
  get: vi.fn(() => Promise.resolve({ id: 1, status: 'complete' })),
};

// Mock Chrome action API
export const mockChromeAction = {
  openPopup: vi.fn(() => Promise.resolve()),
  setIcon: vi.fn(() => Promise.resolve()),
  setBadgeText: vi.fn(() => Promise.resolve()),
  setBadgeBackgroundColor: vi.fn(() => Promise.resolve()),
};

// Mock Chrome system.display API
export const mockChromeSystemDisplay = {
  getInfo: vi.fn(() =>
    Promise.resolve([
      {
        id: 'display-1',
        name: 'Built-in Display',
        isPrimary: true,
        workArea: {
          left: 0,
          top: 0,
          width: 1920,
          height: 1080,
        },
        bounds: {
          left: 0,
          top: 0,
          width: 1920,
          height: 1080,
        },
      },
    ])
  ),
};

// Combined Chrome mock
export const mockChrome = {
  storage: mockChromeStorage,
  runtime: mockChromeRuntime,
  commands: mockChromeCommands,
  windows: mockChromeWindows,
  tabs: mockChromeTabs,
  action: mockChromeAction,
  system: {
    display: mockChromeSystemDisplay,
  },
};

// Helper to reset all mocks and storage
export function resetChromeMocks(): void {
  mockStorageData = {};
  vi.clearAllMocks();
}

// Helper to set initial storage data for tests
export function setMockStorageData(data: Record<string, unknown>): void {
  mockStorageData = { ...data };
}

// Helper to get current mock storage data
export function getMockStorageData(): Record<string, unknown> {
  return { ...mockStorageData };
}
