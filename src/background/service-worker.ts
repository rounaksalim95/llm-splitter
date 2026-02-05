import {
  type ExtensionMessage,
  type InjectQueryMessage,
  type MessageResponse,
  type PongMessage,
  type QuerySubmitMessage,
  type WindowPosition,
  type Provider,
  SELECTED_TEXT_STORAGE_KEY,
} from '../shared/types';
import { DEFAULT_PROVIDERS, getProviderById } from '../shared/providers';
import { getStorageData } from '../shared/storage';

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
        left: Math.round(screenLeft + i * windowWidth),
        top: Math.round(screenTop),
        width: Math.round(windowWidth),
        height: Math.round(screenHeight),
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
 * Info about a created window, used to track windows during two-phase creation
 */
interface CreatedWindow {
  windowId: number;
  tabId: number;
  provider: Provider;
}

/**
 * Verifies window position matches expected and corrects if needed.
 * Returns true if position is correct (or was successfully corrected).
 */
async function verifyAndCorrectPosition(
  windowId: number,
  expected: WindowPosition,
  maxRetries: number = 3
): Promise<boolean> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const actual = await chrome.windows.get(windowId);

    // Check if position matches (with small tolerance for rounding)
    const isCorrect =
      Math.abs((actual.left ?? 0) - expected.left) <= 5 &&
      Math.abs((actual.top ?? 0) - expected.top) <= 5 &&
      Math.abs((actual.width ?? 0) - expected.width) <= 5 &&
      Math.abs((actual.height ?? 0) - expected.height) <= 5;

    if (isCorrect) {
      console.log(`[DEBUG] Window ${windowId} position verified on attempt ${attempt + 1}`);
      return true;
    }

    // Position incorrect - try to fix it
    console.warn(`[DEBUG] Window ${windowId} position mismatch (attempt ${attempt + 1}):`, {
      expected,
      actual: { left: actual.left, top: actual.top, width: actual.width, height: actual.height },
    });

    await chrome.windows.update(windowId, {
      left: expected.left,
      top: expected.top,
      width: expected.width,
      height: expected.height,
      state: 'normal',
    });

    // Small delay before re-checking
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return false; // Failed after all retries
}

/**
 * Phase 1: Creates and positions a window for a provider (without waiting for page load)
 * This is fast and should complete quickly before any slow page loads interfere
 */
async function createAndPositionWindow(
  provider: Provider,
  position: WindowPosition
): Promise<CreatedWindow | null> {
  // Create window WITH position parameters - most reliable for initial positioning
  // Also include state: 'normal' to ensure position params are honored
  // (Chrome docs: minimized/maximized/fullscreen states cannot be combined with position)
  const window = await chrome.windows.create({
    url: provider.newChatUrl,
    type: 'normal',
    focused: false,
    state: 'normal',
    left: position.left,
    top: position.top,
    width: position.width,
    height: position.height,
  });

  if (!window.id) {
    console.error(`Failed to create window for ${provider.name}`);
    return null;
  }

  console.log(`[DEBUG] Created window for ${provider.name}:`, {
    windowId: window.id,
    state: window.state,
    returnedBounds: { left: window.left, top: window.top, width: window.width, height: window.height },
    expectedPosition: position,
  });

  // Verify and correct position if needed (handles Chrome ignoring position params)
  const positionOk = await verifyAndCorrectPosition(window.id, position);
  if (!positionOk) {
    console.warn(`[DEBUG] Could not achieve correct position for ${provider.name} after retries`);
  }

  if (!window.tabs || window.tabs.length === 0 || !window.tabs[0].id) {
    console.error(`Failed to create window with tabs for ${provider.name}`);
    return null;
  }

  return {
    windowId: window.id,
    tabId: window.tabs[0].id,
    provider,
  };
}

/**
 * Phase 2: Waits for a tab to load and injects the query
 * This can be slow (depends on site load time) and runs after all windows are positioned
 */
async function waitAndInjectQuery(
  createdWindow: CreatedWindow,
  query: string
): Promise<void> {
  const { tabId, provider } = createdWindow;

  // Wait for the tab to finish loading
  await waitForTabLoad(tabId);

  // Wait for content script to be ready
  const isReady = await waitForContentScript(tabId);
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
    await chrome.tabs.sendMessage(tabId, message);
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

  // Get storage data for provider configs (uses chrome.storage.local like the rest of the app)
  const storageData = await getStorageData();
  const providers = storageData.providers;

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
  console.log('[DEBUG] Screen dimensions:', screenDimensions);

  const settings = storageData.settings;
  const layout = settings.defaultLayout;

  const positions = calculateWindowPositions(
    screenDimensions,
    selectedProviders.length,
    layout
  );
  console.log('[DEBUG] Calculated positions:', positions);

  // Two-phase window creation to prevent positioning race conditions:
  // Phase 1: Create and position ALL windows quickly (before slow page loads interfere)
  // Phase 2: Wait for tabs to load and inject queries (can be slow, done in parallel)
  try {
    // Phase 1: Create and position all windows
    const createdWindows: CreatedWindow[] = [];
    for (let i = 0; i < selectedProviders.length; i++) {
      const created = await createAndPositionWindow(selectedProviders[i], positions[i]);
      if (created) {
        createdWindows.push(created);
      }
      // Small delay between windows for Chrome to stabilize positioning
      if (i < selectedProviders.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    // Phase 2: Wait for tabs to load and inject queries (in parallel for speed)
    await Promise.all(
      createdWindows.map((cw) => waitAndInjectQuery(cw, query.trim()))
    );

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

// Track the popup window ID for toggle behavior
let popupWindowId: number | null = null;

const CONTEXT_MENU_ID = 'llm-splitter-query';

/**
 * Creates the context menu item for selected text.
 * Uses removeAll() first to handle duplicate creation gracefully.
 */
function createContextMenu(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: 'Query with LLM Splitter',
      contexts: ['selection'],
    });
  });
}

/**
 * Handles context menu item clicks
 */
async function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  _tab?: chrome.tabs.Tab
): Promise<void> {
  if (info.menuItemId !== CONTEXT_MENU_ID) {
    return;
  }

  const selectedText = info.selectionText?.trim();
  if (!selectedText) {
    console.warn('No text selected');
    return;
  }

  // Store the selected text for the compose page to read
  await chrome.storage.local.set({ [SELECTED_TEXT_STORAGE_KEY]: selectedText });

  // Open the compose page in a small popup window, positioned in the top right
  const composeUrl = chrome.runtime.getURL('src/compose/compose.html');
  const screen = await getScreenDimensions();
  const composeWidth = 520;
  const composeHeight = 700;

  await chrome.windows.create({
    url: composeUrl,
    type: 'popup',
    width: composeWidth,
    height: composeHeight,
    left: screen.left + screen.width - composeWidth,
    top: screen.top,
    focused: true,
  });
}

/**
 * Toggles the popup window open/closed
 */
async function togglePopup(): Promise<void> {
  // If we have a tracked window ID, check if it still exists
  if (popupWindowId !== null) {
    try {
      await chrome.windows.get(popupWindowId);
      // Window exists, close it
      await chrome.windows.remove(popupWindowId);
      popupWindowId = null;
      return;
    } catch {
      // Window doesn't exist (user closed it manually), reset state
      popupWindowId = null;
    }
  }

  // Get screen dimensions to position popup in top right
  const screen = await getScreenDimensions();

  // Size popup to fit content snugly
  // Width: 350px content + minimal window chrome
  // Height: sized to fit content without scrollbar
  const popupWidth = 350;
  const popupHeight = 480;

  // Position in top right corner
  const left = screen.left + screen.width - popupWidth;
  const top = screen.top;

  // No popup window exists, create one
  const popupUrl = chrome.runtime.getURL('src/popup/popup.html');
  const window = await chrome.windows.create({
    url: popupUrl,
    type: 'popup',
    width: popupWidth,
    height: popupHeight,
    left: left,
    top: top,
    focused: true,
  });

  if (window.id) {
    popupWindowId = window.id;
  }
}

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

  // Context menu click listener
  chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

  // Extension icon click listener (triggers toggle)
  chrome.action.onClicked.addListener(() => {
    togglePopup();
  });

  // Keyboard shortcut listener for toggle-popup command
  chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-popup') {
      togglePopup();
    }
  });

  // Track when popup window is closed by any means (user clicks X, etc.)
  chrome.windows.onRemoved.addListener((windowId) => {
    if (windowId === popupWindowId) {
      popupWindowId = null;
    }
  });

  listenersInitialized = true;
}

/**
 * Resets initialization state. Only for testing.
 */
export function resetListeners(): void {
  listenersInitialized = false;
}

// Initialize listeners
setupListeners();

// Create context menu on service worker initialization
// This handles all cases: install, update, browser restart, extension reload/re-enable
createContextMenu();
