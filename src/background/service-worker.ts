import type {
  ExtensionMessage,
  InjectQueryMessage,
  MessageResponse,
  PongMessage,
  QuerySubmitMessage,
  WindowPosition,
  Provider,
  StorageData,
} from '../shared/types';
import { DEFAULT_PROVIDERS, getProviderById } from '../shared/providers';
import { getDefaults } from '../shared/storage';

/**
 * Calculates window positions for arranging provider windows side-by-side
 */
function calculateWindowPositions(
  screen: { width: number; height: number; left: number; top: number },
  providerCount: number,
  layout: 'horizontal' | 'grid' | 'vertical'
): WindowPosition[] {
  const positions: WindowPosition[] = [];
  const { width: screenWidth, height: screenHeight, left: screenLeft, top: screenTop } = screen;

  if (layout === 'grid' && providerCount === 4) {
    // 2x2 grid layout for 4 providers
    const halfWidth = Math.floor(screenWidth / 2);
    const halfHeight = Math.floor(screenHeight / 2);

    positions.push({ left: screenLeft, top: screenTop, width: halfWidth, height: halfHeight });
    positions.push({ left: screenLeft + halfWidth, top: screenTop, width: halfWidth, height: halfHeight });
    positions.push({ left: screenLeft, top: screenTop + halfHeight, width: halfWidth, height: halfHeight });
    positions.push({ left: screenLeft + halfWidth, top: screenTop + halfHeight, width: halfWidth, height: halfHeight });
  } else {
    // Horizontal split (default)
    const windowWidth = Math.floor(screenWidth / providerCount);

    for (let i = 0; i < providerCount; i++) {
      positions.push({
        left: screenLeft + i * windowWidth,
        top: screenTop,
        width: windowWidth,
        height: screenHeight,
      });
    }
  }

  return positions;
}

/**
 * Gets the current screen dimensions using the system display API
 */
async function getScreenDimensions(): Promise<{ width: number; height: number; left: number; top: number }> {
  try {
    const displays = await chrome.system.display.getInfo();
    if (displays?.length > 0) {
      const primary = displays.find((d) => d.isPrimary) || displays[0];
      return {
        width: primary.workArea.width,
        height: primary.workArea.height,
        left: primary.workArea.left,
        top: primary.workArea.top,
      };
    }
  } catch (error) {
    console.warn('Failed to get display info:', error);
  }
  // Fallback values
  return { width: 1920, height: 1080, left: 0, top: 0 };
}

/**
 * Opens a window for a provider and injects the query
 */
async function openProviderWindow(
  provider: Provider,
  query: string,
  position: WindowPosition
): Promise<void> {
  // Create the window at the calculated position
  const window = await chrome.windows.create({
    url: provider.newChatUrl,
    left: position.left,
    top: position.top,
    width: position.width,
    height: position.height,
    type: 'normal',
  });

  if (!window.tabs || window.tabs.length === 0) {
    console.error(`Failed to create window for ${provider.name}`);
    return;
  }

  const tab = window.tabs[0];
  if (!tab.id) {
    console.error(`No tab ID for ${provider.name}`);
    return;
  }

  // Wait for the tab to finish loading
  await waitForTabLoad(tab.id);

  // Wait for content script to be ready
  const isReady = await waitForContentScript(tab.id);
  if (!isReady) {
    console.error(`Content script not ready for ${provider.name}`);
    return;
  }

  // Send message to content script to inject the query
  const message: InjectQueryMessage = {
    type: 'INJECT_QUERY',
    payload: {
      query,
      inputSelector: provider.inputSelector,
      submitSelector: provider.submitSelector,
    },
  };

  try {
    await chrome.tabs.sendMessage(tab.id, message);
  } catch (error) {
    console.error(`Failed to send message to ${provider.name}:`, error);
  }
}

/**
 * Waits for a tab to finish loading
 */
function waitForTabLoad(tabId: number, timeout: number = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkTab = async () => {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab.status === 'complete') {
          resolve();
          return;
        }

        if (Date.now() - startTime > timeout) {
          resolve(); // Resolve anyway after timeout
          return;
        }

        setTimeout(checkTab, 100);
      } catch (error) {
        reject(error);
      }
    };

    checkTab();
  });
}

/**
 * Waits for the content script to be ready by sending PING messages
 * until the content script responds with PONG
 */
export async function waitForContentScript(
  tabId: number,
  maxAttempts: number = 20,
  intervalMs: number = 250
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { type: 'PING' }) as PongMessage | undefined;
      if (response?.type === 'PONG') {
        return true;
      }
    } catch {
      // Content script not ready yet, retry
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

/**
 * Handles SUBMIT_QUERY messages
 */
export async function handleQuerySubmit(payload: {
  query: string;
  providerIds: string[];
}): Promise<MessageResponse> {
  const { query, providerIds } = payload;

  // Validate query
  if (!query || query.trim().length === 0) {
    return {
      success: false,
      error: 'Query cannot be empty',
    };
  }

  // Validate providers
  if (!providerIds || providerIds.length === 0) {
    return {
      success: false,
      error: 'At least one provider must be selected',
    };
  }

  // Get storage data for provider configs
  const storageData = await chrome.storage.sync.get(null) as Partial<StorageData>;
  const providers = storageData.providers || getDefaults().providers;

  // Get selected providers
  const selectedProviders: Provider[] = [];
  for (const id of providerIds) {
    const provider = providers.find((p) => p.id === id);
    if (provider) {
      selectedProviders.push(provider);
    }
  }

  if (selectedProviders.length === 0) {
    return {
      success: false,
      error: 'No valid providers found',
    };
  }

  // Get screen dimensions and calculate positions
  const screenDimensions = await getScreenDimensions();
  const settings = storageData.settings || getDefaults().settings;
  const layout = settings.defaultLayout;

  const positions = calculateWindowPositions(
    screenDimensions,
    selectedProviders.length,
    layout
  );

  // Open windows for each provider
  const openPromises = selectedProviders.map((provider, index) =>
    openProviderWindow(provider, query.trim(), positions[index])
  );

  try {
    await Promise.all(openPromises);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to open windows: ${error}`,
    };
  }
}

/**
 * Routes messages to appropriate handlers
 */
export async function handleMessage(
  message: ExtensionMessage
): Promise<MessageResponse> {
  switch (message.type) {
    case 'SUBMIT_QUERY':
      return handleQuerySubmit((message as QuerySubmitMessage).payload);
    default:
      return {
        success: false,
        error: `Unknown message type: ${(message as { type: string }).type}`,
      };
  }
}

// Track initialization state to prevent duplicate listener registration
let listenersInitialized = false;

/**
 * Sets up all event listeners. Idempotent - safe to call multiple times.
 */
export function setupListeners(): void {
  if (listenersInitialized) {
    return;
  }

  // Message listener
  chrome.runtime.onMessage.addListener(
    (
      message: ExtensionMessage,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: MessageResponse) => void
    ) => {
      handleMessage(message).then(sendResponse);
      return true; // Keep message channel open for async response
    }
  );

  listenersInitialized = true;

  // Note: Keyboard shortcut to open popup is handled by Chrome's
  // built-in _execute_action command in manifest.json
}

/**
 * Resets initialization state. Only for testing.
 */
export function resetListeners(): void {
  listenersInitialized = false;
}

// Initialize listeners
setupListeners();
