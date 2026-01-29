import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleMessage, handleQuerySubmit, setupListeners, resetListeners, waitForContentScript } from './service-worker';
import {
  mockChromeRuntime,
  mockChromeWindows,
  mockChromeTabs,
  mockChromeStorage,
  mockChromeSystemDisplay,
  resetWindowTracking,
} from '../test/mocks/chrome';
import type { QuerySubmitMessage } from '../shared/types';

describe('Service Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetWindowTracking(); // Reset window ID counter and positions
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

    it('should return error when providers array is undefined', async () => {
      const payload = {
        query: 'test query',
        providerIds: undefined as unknown as string[],
      };

      const response = await handleQuerySubmit(payload);
      expect(response.success).toBe(false);
      expect(response.error).toContain('At least one provider must be selected');
    });
  });

  describe('Window Management', () => {
    it('should create windows for each selected provider', async () => {
      const payload = {
        query: 'test query',
        providerIds: ['chatgpt', 'claude'],
      };

      await handleQuerySubmit(payload);

      expect(mockChromeWindows.create).toHaveBeenCalledTimes(2);
    });

    it('should position windows side by side for 2 providers using windows.create with position params', async () => {
      const payload = {
        query: 'test query',
        providerIds: ['chatgpt', 'claude'],
      };

      await handleQuerySubmit(payload);

      // Windows should be created with focused: false and position parameters
      expect(mockChromeWindows.create).toHaveBeenCalledTimes(2);
      const createCalls = mockChromeWindows.create.mock.calls;

      // Both should have focused: false and state: 'normal'
      expect(createCalls[0][0].focused).toBe(false);
      expect(createCalls[0][0].state).toBe('normal');
      expect(createCalls[1][0].focused).toBe(false);
      expect(createCalls[1][0].state).toBe('normal');

      // First window should be on the left with position params
      expect(createCalls[0][0].left).toBe(0);
      expect(createCalls[0][0]).toHaveProperty('top');
      expect(createCalls[0][0]).toHaveProperty('width');
      expect(createCalls[0][0]).toHaveProperty('height');

      // Second window should be on the right with position params
      expect(createCalls[1][0].left).toBeGreaterThan(0);
      expect(createCalls[1][0]).toHaveProperty('top');
      expect(createCalls[1][0]).toHaveProperty('width');
      expect(createCalls[1][0]).toHaveProperty('height');

      // windows.get should be called for position verification
      expect(mockChromeWindows.get).toHaveBeenCalled();
    });

    it('should create windows with correct URLs and position params', async () => {
      const payload = {
        query: 'test query',
        providerIds: ['chatgpt', 'gemini'],
      };

      await handleQuerySubmit(payload);

      const createCalls = mockChromeWindows.create.mock.calls;
      expect(createCalls[0][0].url).toBe('https://chatgpt.com/');
      expect(createCalls[1][0].url).toBe('https://gemini.google.com/app');

      // Verify windows.create was called with position info
      expect(createCalls[0][0]).toHaveProperty('left');
      expect(createCalls[0][0]).toHaveProperty('top');
      expect(createCalls[0][0]).toHaveProperty('width');
      expect(createCalls[0][0]).toHaveProperty('height');
      expect(createCalls[1][0]).toHaveProperty('left');
      expect(createCalls[1][0]).toHaveProperty('top');
      expect(createCalls[1][0]).toHaveProperty('width');
      expect(createCalls[1][0]).toHaveProperty('height');

      // Verify windows.get was called to verify position
      expect(mockChromeWindows.get).toHaveBeenCalled();
    });

    it('should send INJECT_QUERY message to each tab after load', async () => {
      const payload = {
        query: 'test query',
        providerIds: ['chatgpt'],
      };

      await handleQuerySubmit(payload);

      expect(mockChromeTabs.sendMessage).toHaveBeenCalled();
      // First call is PING for content script readiness, second is INJECT_QUERY
      const injectCalls = mockChromeTabs.sendMessage.mock.calls.filter(
        (call: [number, { type: string }]) => call[1].type === 'INJECT_QUERY'
      );
      expect(injectCalls.length).toBeGreaterThan(0);
      expect(injectCalls[0][1].type).toBe('INJECT_QUERY');
      expect(injectCalls[0][1].payload.query).toBe('test query');
    });

    it('should include correct selectors in INJECT_QUERY message', async () => {
      const payload = {
        query: 'test query',
        providerIds: ['claude'],
      };

      await handleQuerySubmit(payload);

      // Find the INJECT_QUERY call (not PING)
      const injectCalls = mockChromeTabs.sendMessage.mock.calls.filter(
        (call: [number, { type: string }]) => call[1].type === 'INJECT_QUERY'
      );
      expect(injectCalls.length).toBeGreaterThan(0);
      expect(injectCalls[0][1].payload.inputSelector).toBe('[contenteditable="true"]');
      expect(injectCalls[0][1].payload.submitSelector).toBe('[aria-label="Send message"]');
    });

    it('should return error when no valid providers found', async () => {
      const payload = {
        query: 'test query',
        providerIds: ['nonexistent-provider'],
      };

      const response = await handleQuerySubmit(payload);
      expect(response.success).toBe(false);
      expect(response.error).toContain('No valid providers found');
    });

    it('should retry positioning if initial position is incorrect', async () => {
      // Mock windows.get to return wrong position first, then correct position
      let getCallCount = 0;
      const originalGet = mockChromeWindows.get;
      mockChromeWindows.get = vi.fn((windowId: number) => {
        getCallCount++;
        if (getCallCount === 1) {
          // First call returns wrong position
          return Promise.resolve({
            id: windowId,
            left: 100, // Wrong position
            top: 100,
            width: 500,
            height: 400,
            state: 'normal',
          });
        }
        // Subsequent calls return correct position (after update)
        return Promise.resolve({
          id: windowId,
          left: 0,
          top: 0,
          width: 1920,
          height: 1080,
          state: 'normal',
        });
      });

      const payload = {
        query: 'test query',
        providerIds: ['chatgpt'],
      };

      await handleQuerySubmit(payload);

      // windows.update should be called to correct the position
      expect(mockChromeWindows.update).toHaveBeenCalled();
      const updateCalls = mockChromeWindows.update.mock.calls;
      // At least one update call should have position correction
      const hasPositionUpdate = updateCalls.some((call: [number, { left?: number }]) =>
        call[1].left !== undefined
      );
      expect(hasPositionUpdate).toBe(true);

      // Restore original mock
      mockChromeWindows.get = originalGet;
    });

    it('should trim query before sending to content script', async () => {
      const payload = {
        query: '  test query with spaces  ',
        providerIds: ['chatgpt'],
      };

      await handleQuerySubmit(payload);

      // Find the INJECT_QUERY call (not PING)
      const injectCalls = mockChromeTabs.sendMessage.mock.calls.filter(
        (call: [number, { type: string }]) => call[1].type === 'INJECT_QUERY'
      );
      expect(injectCalls.length).toBeGreaterThan(0);
      expect(injectCalls[0][1].payload.query).toBe('test query with spaces');
    });
  });

  describe('setupListeners', () => {
    it('should register message listener', () => {
      setupListeners();
      expect(mockChromeRuntime.onMessage.addListener).toHaveBeenCalled();
    });

    it('should only register listeners once', () => {
      setupListeners();
      setupListeners();
      setupListeners();
      expect(mockChromeRuntime.onMessage.addListener).toHaveBeenCalledTimes(1);
    });
  });

  // Note: Keyboard shortcut to open popup is handled by Chrome's
  // built-in _execute_action command, no custom handler needed

  describe('waitForContentScript', () => {
    it('should return true when content script responds with PONG', async () => {
      mockChromeTabs.sendMessage.mockResolvedValueOnce({ type: 'PONG' });

      const result = await waitForContentScript(1, 3, 10);
      expect(result).toBe(true);
      expect(mockChromeTabs.sendMessage).toHaveBeenCalledWith(1, { type: 'PING' });
    });

    it('should retry when content script is not ready', async () => {
      mockChromeTabs.sendMessage
        .mockRejectedValueOnce(new Error('Could not establish connection'))
        .mockRejectedValueOnce(new Error('Could not establish connection'))
        .mockResolvedValueOnce({ type: 'PONG' });

      const result = await waitForContentScript(1, 5, 10);
      expect(result).toBe(true);
      expect(mockChromeTabs.sendMessage).toHaveBeenCalledTimes(3);
    });

    it('should return false after max attempts', async () => {
      mockChromeTabs.sendMessage.mockRejectedValue(new Error('Could not establish connection'));

      const result = await waitForContentScript(1, 3, 10);
      expect(result).toBe(false);
      expect(mockChromeTabs.sendMessage).toHaveBeenCalledTimes(3);
    });

    it('should return false when response is not PONG', async () => {
      mockChromeTabs.sendMessage.mockResolvedValue({ type: 'UNKNOWN' });

      const result = await waitForContentScript(1, 3, 10);
      expect(result).toBe(false);
    });
  });
});
