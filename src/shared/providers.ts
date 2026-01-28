import type { Provider, StorageData } from './types';

/**
 * Default LLM providers included with the extension
 */
export const DEFAULT_PROVIDERS: Provider[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    newChatUrl: 'https://chatgpt.com/',
    inputSelector: '#prompt-textarea',
    submitSelector: '[data-testid="send-button"]',
    enabled: true,
    urlPattern: 'chatgpt.com',
  },
  {
    id: 'claude',
    name: 'Claude',
    newChatUrl: 'https://claude.ai/new',
    inputSelector: '[contenteditable="true"]',
    submitSelector: '[aria-label="Send Message"]',
    enabled: true,
    urlPattern: 'claude.ai',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    newChatUrl: 'https://gemini.google.com/app',
    inputSelector: '.ql-editor',
    submitSelector: '[aria-label="Send message"]',
    enabled: true,
    urlPattern: 'gemini.google.com',
  },
  {
    id: 'grok',
    name: 'Grok',
    newChatUrl: 'https://grok.com/',
    inputSelector: 'textarea',
    submitSelector: '[aria-label="Submit"]',
    enabled: true,
    urlPattern: 'grok.com',
  },
];

/**
 * Gets a provider by ID from storage data
 */
export function getProviderById(
  id: string,
  storageData: StorageData
): Provider | undefined {
  return storageData.providers.find((p) => p.id === id);
}

/**
 * Gets all enabled providers from storage data
 */
export function getEnabledProviders(storageData: StorageData): Provider[] {
  return storageData.providers.filter((p) => p.enabled);
}

/**
 * Validation result for a provider
 */
export interface ProviderValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a provider object
 */
export function validateProvider(provider: Provider): ProviderValidationResult {
  const errors: string[] = [];

  if (!provider.id) {
    errors.push('id is required');
  }

  if (!provider.name) {
    errors.push('name is required');
  }

  if (!provider.newChatUrl) {
    errors.push('newChatUrl is required');
  } else {
    try {
      new URL(provider.newChatUrl);
    } catch {
      errors.push('newChatUrl must be a valid URL');
    }
  }

  if (!provider.inputSelector) {
    errors.push('inputSelector is required');
  }

  if (!provider.submitSelector) {
    errors.push('submitSelector is required');
  }

  if (!provider.urlPattern) {
    errors.push('urlPattern is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
