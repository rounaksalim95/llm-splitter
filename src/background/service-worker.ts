import type { ExtensionMessage, MessageResponse, QuerySubmitMessage } from '../shared/types';

// Store pending query for content scripts (to be implemented in later phases)
let pendingQuery: { query: string; providerIds: string[] } | null = null;

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

  // Store pending query for later use
  pendingQuery = {
    query: query.trim(),
    providerIds,
  };

  // In later phases, this will open windows for each provider
  // For now, just return success
  return { success: true };
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

// Export for testing
export { pendingQuery };
