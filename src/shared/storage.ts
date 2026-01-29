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
 * Returns default storage data for synchronous access.
 * Use getStorageData() for async access with persistence.
 */
export function getDefaults(): StorageData {
  return {
    providers: DEFAULT_PROVIDERS.map((p) => ({ ...p })),
    queryHistory: [],
    settings: { ...DEFAULT_STORAGE_DATA.settings },
  };
}

/**
 * Creates a fresh copy of the default storage data.
 * This prevents mutation of the shared DEFAULT_STORAGE_DATA constant.
 */
function createDefaultStorageData(): StorageData {
  return {
    providers: DEFAULT_PROVIDERS.map((p) => ({ ...p })),
    queryHistory: [],
    settings: { ...DEFAULT_STORAGE_DATA.settings },
  };
}

/**
 * Retrieves all storage data, merging with defaults for missing fields
 */
export async function getStorageData(): Promise<StorageData> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as Partial<StorageData> | undefined;

  if (!stored) {
    // Return a fresh copy to prevent mutation of defaults
    return createDefaultStorageData();
  }

  // Merge with defaults to ensure all fields exist, using fresh copies
  return {
    providers: stored.providers ?? DEFAULT_PROVIDERS.map((p) => ({ ...p })),
    queryHistory: stored.queryHistory ? [...stored.queryHistory] : [],
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

/**
 * Updates the order of providers based on an array of provider IDs
 */
export async function updateProviderOrder(orderedIds: string[]): Promise<void> {
  const data = await getStorageData();

  // Create a map for quick lookup
  const providerMap = new Map(data.providers.map(p => [p.id, p]));

  // Reorder providers based on the ordered IDs
  const reorderedProviders = orderedIds
    .map(id => providerMap.get(id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  // Add any providers that weren't in the orderedIds (shouldn't happen, but safety)
  const orderedIdSet = new Set(orderedIds);
  const remainingProviders = data.providers.filter(p => !orderedIdSet.has(p.id));

  data.providers = [...reorderedProviders, ...remainingProviders];
  await setStorageData(data);
}

/**
 * Toggles a provider's enabled state
 */
export async function toggleProvider(id: string, enabled: boolean): Promise<void> {
  const data = await getStorageData();

  const provider = data.providers.find(p => p.id === id);
  if (provider) {
    provider.enabled = enabled;
    await setStorageData(data);
  }
}
