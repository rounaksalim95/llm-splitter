import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PROVIDERS,
  getProviderById,
  getEnabledProviders,
  validateProvider,
} from './providers';
import { DEFAULT_STORAGE_DATA } from './storage';
import type { Provider, StorageData } from './types';

describe('Providers', () => {
  describe('DEFAULT_PROVIDERS', () => {
    it('should include ChatGPT with correct URL', () => {
      const chatgpt = DEFAULT_PROVIDERS.find((p) => p.id === 'chatgpt');
      expect(chatgpt).toBeDefined();
      expect(chatgpt?.name).toBe('ChatGPT');
      expect(chatgpt?.newChatUrl).toBe('https://chatgpt.com/');
      expect(chatgpt?.enabled).toBe(true);
    });

    it('should include Claude with correct URL', () => {
      const claude = DEFAULT_PROVIDERS.find((p) => p.id === 'claude');
      expect(claude).toBeDefined();
      expect(claude?.name).toBe('Claude');
      expect(claude?.newChatUrl).toBe('https://claude.ai/new');
      expect(claude?.enabled).toBe(true);
    });

    it('should include Gemini with correct URL', () => {
      const gemini = DEFAULT_PROVIDERS.find((p) => p.id === 'gemini');
      expect(gemini).toBeDefined();
      expect(gemini?.name).toBe('Gemini');
      expect(gemini?.newChatUrl).toBe('https://gemini.google.com/app');
      expect(gemini?.enabled).toBe(true);
    });

    it('should include Grok with correct URL', () => {
      const grok = DEFAULT_PROVIDERS.find((p) => p.id === 'grok');
      expect(grok).toBeDefined();
      expect(grok?.name).toBe('Grok');
      expect(grok?.newChatUrl).toBe('https://grok.com/');
      expect(grok?.enabled).toBe(true);
    });

    it('should have 4 default providers', () => {
      expect(DEFAULT_PROVIDERS).toHaveLength(4);
    });

    it('all providers should have required fields', () => {
      DEFAULT_PROVIDERS.forEach((provider) => {
        expect(provider.id).toBeTruthy();
        expect(provider.name).toBeTruthy();
        expect(provider.newChatUrl).toBeTruthy();
        expect(provider.inputSelector).toBeTruthy();
        expect(provider.submitSelector).toBeTruthy();
        expect(typeof provider.enabled).toBe('boolean');
        expect(provider.urlPattern).toBeTruthy();
      });
    });
  });

  describe('getProviderById', () => {
    it('should return provider when found', () => {
      const provider = getProviderById('chatgpt', DEFAULT_STORAGE_DATA);
      expect(provider).toBeDefined();
      expect(provider?.id).toBe('chatgpt');
    });

    it('should return undefined when provider not found', () => {
      const provider = getProviderById('nonexistent', DEFAULT_STORAGE_DATA);
      expect(provider).toBeUndefined();
    });
  });

  describe('getEnabledProviders', () => {
    it('should return only enabled providers', () => {
      const providers = getEnabledProviders(DEFAULT_STORAGE_DATA);
      expect(providers.every((p) => p.enabled)).toBe(true);
    });

    it('should exclude disabled providers', () => {
      const customProviders = DEFAULT_PROVIDERS.map((p) =>
        p.id === 'grok' ? { ...p, enabled: false } : p
      );
      const customStorageData: StorageData = {
        ...DEFAULT_STORAGE_DATA,
        providers: customProviders,
      };

      const providers = getEnabledProviders(customStorageData);
      expect(providers.find((p) => p.id === 'grok')).toBeUndefined();
      expect(providers).toHaveLength(3);
    });
  });

  describe('validateProvider', () => {
    it('should return valid for complete provider', () => {
      const provider: Provider = {
        id: 'test',
        name: 'Test Provider',
        newChatUrl: 'https://test.com/',
        inputSelector: 'textarea',
        submitSelector: 'button',
        enabled: true,
        urlPattern: 'test.com',
      };

      const result = validateProvider(provider);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for missing id', () => {
      const provider = {
        name: 'Test',
        newChatUrl: 'https://test.com/',
        inputSelector: 'textarea',
        submitSelector: 'button',
        enabled: true,
        urlPattern: 'test.com',
      } as Provider;

      const result = validateProvider(provider);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('id is required');
    });

    it('should return error for missing name', () => {
      const provider = {
        id: 'test',
        newChatUrl: 'https://test.com/',
        inputSelector: 'textarea',
        submitSelector: 'button',
        enabled: true,
        urlPattern: 'test.com',
      } as Provider;

      const result = validateProvider(provider);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name is required');
    });

    it('should return error for invalid URL', () => {
      const provider: Provider = {
        id: 'test',
        name: 'Test',
        newChatUrl: 'not-a-url',
        inputSelector: 'textarea',
        submitSelector: 'button',
        enabled: true,
        urlPattern: 'test.com',
      };

      const result = validateProvider(provider);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('newChatUrl must be a valid URL');
    });

    it('should return error for missing selectors', () => {
      const provider = {
        id: 'test',
        name: 'Test',
        newChatUrl: 'https://test.com/',
        inputSelector: '',
        submitSelector: '',
        enabled: true,
        urlPattern: 'test.com',
      } as Provider;

      const result = validateProvider(provider);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('inputSelector is required');
      expect(result.errors).toContain('submitSelector is required');
    });

    it('should return multiple errors at once', () => {
      const provider = {
        id: '',
        name: '',
        newChatUrl: '',
        inputSelector: '',
        submitSelector: '',
        enabled: true,
        urlPattern: '',
      } as Provider;

      const result = validateProvider(provider);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
