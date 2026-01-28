import type { StorageData, Settings } from './types';
import { DEFAULT_PROVIDERS } from './providers';

/**
 * Default storage data used when no data exists
 */
export const DEFAULT_STORAGE_DATA: StorageData = {
  providers: DEFAULT_PROVIDERS,
  queryHistory: [],
  settings: {
    maxHistoryItems: 50,
    keyboardShortcut: 'Ctrl+Shift+Q',
    defaultLayout: 'grid',
  },
};

const STORAGE_KEY = 'storageData';

/**
 * Retrieves all storage data, merging with defaults for missing fields
 */
export async function getStorageData(): Promise<StorageData> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as Partial<StorageData> | undefined;

  if (!stored) {
    return DEFAULT_STORAGE_DATA;
  }

  // Merge with defaults to ensure all fields exist
  return {
    providers: stored.providers ?? DEFAULT_STORAGE_DATA.providers,
    queryHistory: stored.queryHistory ?? DEFAULT_STORAGE_DATA.queryHistory,
    settings: {
      ...DEFAULT_STORAGE_DATA.settings,
      ...stored.settings,
    },
  };
}

/**
 * Stores all storage data
 */
export async function setStorageData(data: StorageData): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

/**
 * Adds a query to the history
 * - Trims whitespace
 * - Deduplicates (moves existing to front)
 * - Respects max history limit
 */
export async function addQueryToHistory(query: string): Promise<void> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return;
  }

  const data = await getStorageData();

  // Remove duplicate if exists
  const filteredHistory = data.queryHistory.filter((q) => q !== trimmedQuery);

  // Add to front
  const newHistory = [trimmedQuery, ...filteredHistory];

  // Trim to max limit
  const maxItems = data.settings.maxHistoryItems;
  data.queryHistory = newHistory.slice(0, maxItems);

  await setStorageData(data);
}

/**
 * Clears all query history
 */
export async function clearQueryHistory(): Promise<void> {
  const data = await getStorageData();
  data.queryHistory = [];
  await setStorageData(data);
}

/**
 * Gets the current settings
 */
export async function getSettings(): Promise<Settings> {
  const data = await getStorageData();
  return data.settings;
}

/**
 * Updates settings with partial values
 */
export async function updateSettings(updates: Partial<Settings>): Promise<void> {
  const data = await getStorageData();
  data.settings = { ...data.settings, ...updates };
  await setStorageData(data);
}
