import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_STORAGE_DATA,
  getDefaults,
  getStorageData,
  setStorageData,
  addQueryToHistory,
  clearQueryHistory,
  getSettings,
  updateSettings,
} from './storage';
import { setMockStorageData, getMockStorageData } from '../test/mocks/chrome';
import type { StorageData, Settings } from './types';

describe('Storage', () => {
  describe('DEFAULT_STORAGE_DATA', () => {
    it('should have default providers array', () => {
      expect(DEFAULT_STORAGE_DATA.providers).toBeDefined();
      expect(Array.isArray(DEFAULT_STORAGE_DATA.providers)).toBe(true);
    });

    it('should have empty query history', () => {
      expect(DEFAULT_STORAGE_DATA.queryHistory).toEqual([]);
    });

    it('should have default settings', () => {
      expect(DEFAULT_STORAGE_DATA.settings.maxHistoryItems).toBe(50);
      expect(DEFAULT_STORAGE_DATA.settings.keyboardShortcut).toBe('Ctrl+Shift+L');
      expect(DEFAULT_STORAGE_DATA.settings.defaultLayout).toBe('grid');
    });
  });

  describe('getDefaults', () => {
    it('should return storage data with default values', () => {
      const defaults = getDefaults();
      expect(defaults.providers).toBeDefined();
      expect(defaults.queryHistory).toEqual([]);
      expect(defaults.settings.maxHistoryItems).toBe(50);
    });

    it('should return a fresh copy each time', () => {
      const defaults1 = getDefaults();
      const defaults2 = getDefaults();

      // Mutate the first copy
      defaults1.queryHistory.push('mutated');
      defaults1.providers[0].name = 'Modified';

      // Second copy should be unaffected
      expect(defaults2.queryHistory).toEqual([]);
      expect(defaults2.providers[0].name).not.toBe('Modified');
    });

    it('should not mutate DEFAULT_STORAGE_DATA', () => {
      const defaults = getDefaults();
      defaults.queryHistory.push('mutated');
      defaults.settings.maxHistoryItems = 999;

      expect(DEFAULT_STORAGE_DATA.queryHistory).toEqual([]);
      expect(DEFAULT_STORAGE_DATA.settings.maxHistoryItems).toBe(50);
    });
  });

  describe('getStorageData', () => {
    it('should return default data when storage is empty', async () => {
      const data = await getStorageData();
      expect(data).toEqual(DEFAULT_STORAGE_DATA);
    });

    it('should return a fresh copy that does not mutate defaults', async () => {
      // Get data when storage is empty (returns defaults)
      const data = await getStorageData();

      // Mutate the returned data
      data.queryHistory.push('mutated');
      data.settings.maxHistoryItems = 999;

      // Verify DEFAULT_STORAGE_DATA was not mutated
      expect(DEFAULT_STORAGE_DATA.queryHistory).toEqual([]);
      expect(DEFAULT_STORAGE_DATA.settings.maxHistoryItems).toBe(50);
    });

    it('should return stored data when available', async () => {
      const customData: StorageData = {
        ...DEFAULT_STORAGE_DATA,
        queryHistory: ['test query'],
      };
      setMockStorageData({ storageData: customData });

      const data = await getStorageData();
      expect(data.queryHistory).toEqual(['test query']);
    });

    it('should merge stored data with defaults for missing fields', async () => {
      // Simulate partial data (missing settings)
      setMockStorageData({
        storageData: {
          providers: [],
          queryHistory: ['query1'],
        },
      });

      const data = await getStorageData();
      expect(data.queryHistory).toEqual(['query1']);
      expect(data.settings).toEqual(DEFAULT_STORAGE_DATA.settings);
    });
  });

  describe('setStorageData', () => {
    it('should store data in chrome storage', async () => {
      const data: StorageData = {
        ...DEFAULT_STORAGE_DATA,
        queryHistory: ['new query'],
      };

      await setStorageData(data);

      const stored = getMockStorageData();
      expect(stored.storageData).toEqual(data);
    });
  });

  describe('addQueryToHistory', () => {
    beforeEach(() => {
      setMockStorageData({ storageData: DEFAULT_STORAGE_DATA });
    });

    it('should add a query to the beginning of history', async () => {
      await addQueryToHistory('test query');

      const data = await getStorageData();
      expect(data.queryHistory[0]).toBe('test query');
    });

    it('should trim whitespace from queries', async () => {
      await addQueryToHistory('  query with spaces  ');

      const data = await getStorageData();
      expect(data.queryHistory[0]).toBe('query with spaces');
    });

    it('should not add empty queries', async () => {
      await addQueryToHistory('');
      await addQueryToHistory('   ');

      const data = await getStorageData();
      expect(data.queryHistory).toEqual([]);
    });

    it('should deduplicate queries (move existing to front)', async () => {
      await addQueryToHistory('first');
      await addQueryToHistory('second');
      await addQueryToHistory('first'); // duplicate

      const data = await getStorageData();
      expect(data.queryHistory).toEqual(['first', 'second']);
    });

    it('should respect max history limit', async () => {
      // Set a small limit for testing
      const customData: StorageData = {
        ...DEFAULT_STORAGE_DATA,
        settings: {
          ...DEFAULT_STORAGE_DATA.settings,
          maxHistoryItems: 3,
        },
      };
      setMockStorageData({ storageData: customData });

      await addQueryToHistory('query1');
      await addQueryToHistory('query2');
      await addQueryToHistory('query3');
      await addQueryToHistory('query4'); // should push out query1

      const data = await getStorageData();
      expect(data.queryHistory).toHaveLength(3);
      expect(data.queryHistory).toEqual(['query4', 'query3', 'query2']);
    });
  });

  describe('clearQueryHistory', () => {
    it('should clear all queries from history', async () => {
      const dataWithHistory: StorageData = {
        ...DEFAULT_STORAGE_DATA,
        queryHistory: ['query1', 'query2', 'query3'],
      };
      setMockStorageData({ storageData: dataWithHistory });

      await clearQueryHistory();

      const data = await getStorageData();
      expect(data.queryHistory).toEqual([]);
    });
  });

  describe('getSettings', () => {
    it('should return current settings', async () => {
      const settings = await getSettings();
      expect(settings).toEqual(DEFAULT_STORAGE_DATA.settings);
    });
  });

  describe('updateSettings', () => {
    it('should update specific settings', async () => {
      await updateSettings({ maxHistoryItems: 100 });

      const settings = await getSettings();
      expect(settings.maxHistoryItems).toBe(100);
      expect(settings.keyboardShortcut).toBe('Ctrl+Shift+L'); // unchanged
    });

    it('should update multiple settings at once', async () => {
      const updates: Partial<Settings> = {
        maxHistoryItems: 25,
        defaultLayout: 'horizontal',
      };

      await updateSettings(updates);

      const settings = await getSettings();
      expect(settings.maxHistoryItems).toBe(25);
      expect(settings.defaultLayout).toBe('horizontal');
    });
  });
});
