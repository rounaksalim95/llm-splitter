/**
 * LLM Splitter - Background Service Worker
 *
 * Handles:
 * - Window management for opening provider tabs
 * - Message routing between popup and content scripts
 * - Settings management
 */

import type { ExtensionMessage, ProviderId, ProviderConfig } from '@shared/types';
import { loadSettings, saveSettings } from '@shared/utils';
import { MESSAGE_TYPES } from '@shared/constants';

/**
 * Tracks open windows for each provider
 */
const openWindows: Map<ProviderId, number> = new Map();

/**
 * Opens windows for all enabled providers and sends the query
 */
async function openProviderWindows(query: string): Promise<void> {
  const settings = await loadSettings();
  const enabledProviders = settings.providers.filter((p) => p.enabled);

  if (enabledProviders.length === 0) {
    console.warn('[LLM Splitter] No providers enabled');
    return;
  }

  const screenWidth = await getScreenWidth();
  const screenHeight = await getScreenHeight();

  const positions = calculateWindowPositions(
    enabledProviders.length,
    settings.windowLayout.arrangement,
    screenWidth,
    screenHeight
  );

  // Open windows for each provider
  for (let i = 0; i < enabledProviders.length; i++) {
    const provider = enabledProviders[i];
    const position = positions[i];

    await openProviderWindow(provider, position, query);
  }
}

/**
 * Opens a single provider window at the specified position
 */
async function openProviderWindow(
  provider: ProviderConfig,
  position: WindowPosition,
  query: string
): Promise<void> {
  try {
    // Store query in storage for content script to retrieve
    await chrome.storage.local.set({
      [`pending_query_${provider.id}`]: query,
    });

    const window = await chrome.windows.create({
      url: provider.url,
      type: 'normal',
      left: position.left,
      top: position.top,
      width: position.width,
      height: position.height,
    });

    if (window.id) {
      openWindows.set(provider.id, window.id);
    }
  } catch (error) {
    console.error(`[LLM Splitter] Failed to open window for ${provider.name}:`, error);
  }
}

interface WindowPosition {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Calculates window positions based on arrangement and screen size
 */
function calculateWindowPositions(
  count: number,
  arrangement: 'horizontal' | 'vertical' | 'grid',
  screenWidth: number,
  screenHeight: number
): WindowPosition[] {
  const positions: WindowPosition[] = [];
  const padding = 0;

  switch (arrangement) {
    case 'horizontal': {
      const width = Math.floor((screenWidth - padding * (count + 1)) / count);
      for (let i = 0; i < count; i++) {
        positions.push({
          left: padding + i * (width + padding),
          top: padding,
          width,
          height: screenHeight - padding * 2,
        });
      }
      break;
    }

    case 'vertical': {
      const height = Math.floor((screenHeight - padding * (count + 1)) / count);
      for (let i = 0; i < count; i++) {
        positions.push({
          left: padding,
          top: padding + i * (height + padding),
          width: screenWidth - padding * 2,
          height,
        });
      }
      break;
    }

    case 'grid':
    default: {
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      const width = Math.floor((screenWidth - padding * (cols + 1)) / cols);
      const height = Math.floor((screenHeight - padding * (rows + 1)) / rows);

      for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        positions.push({
          left: padding + col * (width + padding),
          top: padding + row * (height + padding),
          width,
          height,
        });
      }
      break;
    }
  }

  return positions;
}

/**
 * Gets the primary screen width
 */
async function getScreenWidth(): Promise<number> {
  const displays = await chrome.system.display.getInfo();
  return displays[0]?.bounds.width ?? 1920;
}

/**
 * Gets the primary screen height
 */
async function getScreenHeight(): Promise<number> {
  const displays = await chrome.system.display.getInfo();
  return displays[0]?.bounds.height ?? 1080;
}

/**
 * Message handler for extension communication
 */
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true; // Indicates async response
});

/**
 * Handles incoming messages from popup and content scripts
 */
async function handleMessage(message: ExtensionMessage): Promise<unknown> {
  switch (message.type) {
    case MESSAGE_TYPES.SUBMIT_QUERY: {
      const query = (message.payload as { query: string })?.query;
      if (query) {
        await openProviderWindows(query);
      }
      return { success: true };
    }

    case MESSAGE_TYPES.GET_SETTINGS: {
      return await loadSettings();
    }

    case MESSAGE_TYPES.SETTINGS_UPDATED: {
      const settings = message.payload;
      if (settings) {
        await saveSettings(settings as Parameters<typeof saveSettings>[0]);
      }
      return { success: true };
    }

    case MESSAGE_TYPES.QUERY_SUBMITTED: {
      const providerId = (message.payload as { providerId: ProviderId })?.providerId;
      console.log(`[LLM Splitter] Query submitted to ${providerId}`);
      return { success: true };
    }

    case MESSAGE_TYPES.QUERY_FAILED: {
      const payload = message.payload as { providerId: ProviderId; error: string };
      console.error(`[LLM Splitter] Query failed for ${payload?.providerId}: ${payload?.error}`);
      return { success: false };
    }

    case MESSAGE_TYPES.PING: {
      return { success: true, timestamp: Date.now() };
    }

    default:
      console.warn('[LLM Splitter] Unknown message type:', message.type);
      return { success: false, error: 'Unknown message type' };
  }
}

// Log when service worker starts
console.log('[LLM Splitter] Background service worker started');
