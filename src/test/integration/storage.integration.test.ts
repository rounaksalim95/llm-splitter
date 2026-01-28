import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStorageData,
  addQueryToHistory,
  clearQueryHistory,
  updateSettings,
} from '../../shared/storage';
import { resetChromeMocks } from '../mocks/chrome';

describe('Storage Integration', () => {
  beforeEach(async () => {
    resetChromeMocks();
    // Clear any existing history to ensure clean state
    await clearQueryHistory();
  });

  describe('Query history persistence', () => {
    it('should persist queries across getStorageData calls', async () => {
      await addQueryToHistory('query 1');
      await addQueryToHistory('query 2');

      const data = await getStorageData();
      expect(data.queryHistory).toContain('query 1');
      expect(data.queryHistory).toContain('query 2');
    });

    it('should maintain query order (newest first)', async () => {
      await addQueryToHistory('first');
      await addQueryToHistory('second');
      await addQueryToHistory('third');

      const data = await getStorageData();
      expect(data.queryHistory[0]).toBe('third');
      expect(data.queryHistory[1]).toBe('second');
      expect(data.queryHistory[2]).toBe('first');
    });

    it('should handle clear and re-add correctly', async () => {
      await addQueryToHistory('initial query');
      await clearQueryHistory();
      await addQueryToHistory('new query');

      const data = await getStorageData();
      expect(data.queryHistory).toEqual(['new query']);
    });

    it('should correctly handle duplicate removal', async () => {
      await addQueryToHistory('alpha');
      await addQueryToHistory('beta');
      await addQueryToHistory('gamma');
      await addQueryToHistory('beta'); // duplicate - should move to front

      const data = await getStorageData();
      expect(data.queryHistory).toEqual(['beta', 'gamma', 'alpha']);
    });
  });

  describe('Settings persistence', () => {
    it('should persist settings changes', async () => {
      await updateSettings({ maxHistoryItems: 25 });
      await updateSettings({ defaultLayout: 'horizontal' });

      const data = await getStorageData();
      expect(data.settings.maxHistoryItems).toBe(25);
      expect(data.settings.defaultLayout).toBe('horizontal');
    });

    it('should not affect other data when updating settings', async () => {
      await addQueryToHistory('test query');
      await updateSettings({ maxHistoryItems: 100 });

      const data = await getStorageData();
      expect(data.queryHistory).toContain('test query');
    });
  });

  describe('Max history enforcement', () => {
    it('should enforce max history limit across multiple operations', async () => {
      await updateSettings({ maxHistoryItems: 5 });

      for (let i = 1; i <= 10; i++) {
        await addQueryToHistory(`query ${i}`);
      }

      const data = await getStorageData();
      expect(data.queryHistory).toHaveLength(5);
      expect(data.queryHistory[0]).toBe('query 10');
      expect(data.queryHistory[4]).toBe('query 6');
    });
  });
});
