import { describe, it, expect } from 'vitest';
import type {
  Provider,
  Settings,
  StorageData,
  QuerySubmitMessage,
  MessageResponse,
} from './types';

describe('Types', () => {
  describe('Provider', () => {
    it('should have all required properties', () => {
      const provider: Provider = {
        id: 'chatgpt',
        name: 'ChatGPT',
        newChatUrl: 'https://chat.openai.com/',
        inputSelector: 'textarea',
        submitSelector: 'button[type="submit"]',
        enabled: true,
        urlPattern: 'chat.openai.com',
      };

      expect(provider.id).toBe('chatgpt');
      expect(provider.name).toBe('ChatGPT');
      expect(provider.newChatUrl).toBe('https://chat.openai.com/');
      expect(provider.inputSelector).toBe('textarea');
      expect(provider.submitSelector).toBe('button[type="submit"]');
      expect(provider.enabled).toBe(true);
      expect(provider.urlPattern).toBe('chat.openai.com');
    });
  });

  describe('Settings', () => {
    it('should have all required properties', () => {
      const settings: Settings = {
        maxHistoryItems: 50,
        keyboardShortcut: 'Ctrl+Shift+Q',
        defaultLayout: 'grid',
      };

      expect(settings.maxHistoryItems).toBe(50);
      expect(settings.keyboardShortcut).toBe('Ctrl+Shift+Q');
      expect(settings.defaultLayout).toBe('grid');
    });
  });

  describe('StorageData', () => {
    it('should have all required properties', () => {
      const storageData: StorageData = {
        providers: [],
        queryHistory: [],
        settings: {
          maxHistoryItems: 50,
          keyboardShortcut: 'Ctrl+Shift+Q',
          defaultLayout: 'grid',
        },
      };

      expect(storageData.providers).toEqual([]);
      expect(storageData.queryHistory).toEqual([]);
      expect(storageData.settings.maxHistoryItems).toBe(50);
    });
  });

  describe('QuerySubmitMessage', () => {
    it('should have correct structure', () => {
      const message: QuerySubmitMessage = {
        type: 'SUBMIT_QUERY',
        payload: {
          query: 'test query',
          providerIds: ['chatgpt', 'claude'],
        },
      };

      expect(message.type).toBe('SUBMIT_QUERY');
      expect(message.payload.query).toBe('test query');
      expect(message.payload.providerIds).toEqual(['chatgpt', 'claude']);
    });
  });

  describe('MessageResponse', () => {
    it('should handle success response', () => {
      const response: MessageResponse = {
        success: true,
      };

      expect(response.success).toBe(true);
      expect(response.error).toBeUndefined();
    });

    it('should handle error response', () => {
      const response: MessageResponse = {
        success: false,
        error: 'Something went wrong',
      };

      expect(response.success).toBe(false);
      expect(response.error).toBe('Something went wrong');
    });
  });
});
