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

// Track window positions for verification
let windowIdCounter = 1;
const windowPositions: Map<number, { left: number; top: number; width: number; height: number; state: string }> = new Map();

// Mock Chrome windows API
export const mockChromeWindows = {
  create: vi.fn((options: { url?: string; left?: number; top?: number; width?: number; height?: number; state?: string }) => {
    const windowId = windowIdCounter++;
    // Store initial position from create options
    windowPositions.set(windowId, {
      left: options.left ?? 0,
      top: options.top ?? 0,
      width: options.width ?? 800,
      height: options.height ?? 600,
      state: options.state ?? 'normal',
    });
    return Promise.resolve({
      id: windowId,
      tabs: [{ id: windowId, status: 'complete' }],
      left: options.left ?? 0,
      top: options.top ?? 0,
      width: options.width ?? 800,
      height: options.height ?? 600,
      state: options.state ?? 'normal',
    });
  }),
  update: vi.fn((windowId: number, updateInfo: { left?: number; top?: number; width?: number; height?: number; state?: string }) => {
    // Update stored position
    const current = windowPositions.get(windowId) || { left: 0, top: 0, width: 800, height: 600, state: 'normal' };
    windowPositions.set(windowId, {
      left: updateInfo.left ?? current.left,
      top: updateInfo.top ?? current.top,
      width: updateInfo.width ?? current.width,
      height: updateInfo.height ?? current.height,
      state: updateInfo.state ?? current.state,
    });
    return Promise.resolve();
  }),
  get: vi.fn((windowId: number) => {
    const pos = windowPositions.get(windowId) || { left: 0, top: 0, width: 800, height: 600, state: 'normal' };
    return Promise.resolve({
      id: windowId,
      ...pos,
    });
  }),
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

// Reset window tracking (call in beforeEach)
export function resetWindowTracking(): void {
  windowIdCounter = 1;
  windowPositions.clear();
}

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
  resetWindowTracking();
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
