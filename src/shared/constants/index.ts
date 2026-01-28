import type { ProviderConfig, UserSettings, WindowLayout } from '../types';

/**
 * Default provider configurations
 */
export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com/',
    enabled: true,
    color: '#10a37f',
  },
  {
    id: 'claude',
    name: 'Claude',
    url: 'https://claude.ai/new',
    enabled: true,
    color: '#d97706',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    url: 'https://gemini.google.com/app',
    enabled: true,
    color: '#4285f4',
  },
  {
    id: 'grok',
    name: 'Grok',
    url: 'https://grok.x.ai/',
    enabled: true,
    color: '#000000',
  },
];

/**
 * Default window layout configuration
 */
export const DEFAULT_WINDOW_LAYOUT: WindowLayout = {
  arrangement: 'grid',
  windowWidth: 800,
  windowHeight: 600,
};

/**
 * Default user settings
 */
export const DEFAULT_SETTINGS: UserSettings = {
  providers: DEFAULT_PROVIDERS,
  windowLayout: DEFAULT_WINDOW_LAYOUT,
  defaultQuery: '',
  theme: 'system',
};

/**
 * Storage keys for chrome.storage
 */
export const STORAGE_KEYS = {
  SETTINGS: 'llm_splitter_settings',
  LAST_QUERY: 'llm_splitter_last_query',
} as const;

/**
 * Extension message action types
 */
export const MESSAGE_TYPES = {
  SUBMIT_QUERY: 'SUBMIT_QUERY',
  QUERY_SUBMITTED: 'QUERY_SUBMITTED',
  QUERY_FAILED: 'QUERY_FAILED',
  GET_SETTINGS: 'GET_SETTINGS',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  PROVIDER_READY: 'PROVIDER_READY',
  PING: 'PING',
} as const;

/**
 * Timeouts and delays (in milliseconds)
 */
export const TIMING = {
  /** Maximum time to wait for input element detection */
  INPUT_DETECTION_TIMEOUT: 10000,
  /** Interval between input detection attempts */
  INPUT_DETECTION_INTERVAL: 500,
  /** Delay after setting input value before submitting */
  SUBMIT_DELAY: 100,
  /** Maximum time to wait for page to be ready */
  PAGE_READY_TIMEOUT: 15000,
} as const;
