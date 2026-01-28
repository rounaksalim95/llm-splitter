import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleMessage, handleQuerySubmit, setupListeners, resetListeners } from './service-worker';
import { mockChromeRuntime } from '../test/mocks/chrome';
import type { QuerySubmitMessage } from '../shared/types';

describe('Service Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetListeners(); // Reset initialization state for clean tests
  });

  describe('handleMessage', () => {
    it('should route SUBMIT_QUERY to handleQuerySubmit', async () => {
      const message: QuerySubmitMessage = {
        type: 'SUBMIT_QUERY',
        payload: {
          query: 'test query',
          providerIds: ['chatgpt', 'claude'],
        },
      };

      const response = await handleMessage(message);
      expect(response.success).toBe(true);
    });

    it('should return error for unknown message type', async () => {
      const message = { type: 'UNKNOWN_TYPE' };

      const response = await handleMessage(message as QuerySubmitMessage);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Unknown message type');
    });
  });

  describe('handleQuerySubmit', () => {
    it('should return success for valid input', async () => {
      const payload = {
        query: 'test query',
        providerIds: ['chatgpt', 'claude'],
      };

      const response = await handleQuerySubmit(payload);
      expect(response.success).toBe(true);
    });

    it('should return error when query is empty', async () => {
      const payload = {
        query: '',
        providerIds: ['chatgpt'],
      };

      const response = await handleQuerySubmit(payload);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Query cannot be empty');
    });

    it('should return error when query is only whitespace', async () => {
      const payload = {
        query: '   ',
        providerIds: ['chatgpt'],
      };

      const response = await handleQuerySubmit(payload);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Query cannot be empty');
    });

    it('should return error when no providers selected', async () => {
      const payload = {
        query: 'test query',
        providerIds: [],
      };

      const response = await handleQuerySubmit(payload);
      expect(response.success).toBe(false);
      expect(response.error).toContain('At least one provider must be selected');
    });

    it('should store pending query on success', async () => {
      const payload = {
        query: 'stored query',
        providerIds: ['chatgpt'],
      };

      const response = await handleQuerySubmit(payload);
      expect(response.success).toBe(true);
      // In later phases, we'd verify the query is stored for content scripts
    });
  });

  describe('setupListeners', () => {
    it('should register message listener', () => {
      setupListeners();
      expect(mockChromeRuntime.onMessage.addListener).toHaveBeenCalled();
    });
  });

  // Note: Keyboard shortcut to open popup is handled by Chrome's
  // built-in _execute_action command, no custom handler needed
});
