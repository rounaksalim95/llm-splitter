import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleMessage } from '../../background/service-worker';
import { getSelectedProviderIds, renderProviderCheckboxes } from '../../popup/popup';
import { DEFAULT_PROVIDERS } from '../../shared/providers';
import { resetChromeMocks, mockChromeRuntime } from '../mocks/chrome';
import type { QuerySubmitMessage } from '../../shared/types';
import { JSDOM } from 'jsdom';

describe('Popup-Background Integration', () => {
  beforeEach(() => {
    resetChromeMocks();
  });

  describe('Message passing', () => {
    it('should successfully process valid query submission', async () => {
      const message: QuerySubmitMessage = {
        type: 'SUBMIT_QUERY',
        payload: {
          query: 'What is the meaning of life?',
          providerIds: ['chatgpt', 'claude'],
        },
      };

      const response = await handleMessage(message);
      expect(response.success).toBe(true);
    });

    it('should return error for invalid query', async () => {
      const message: QuerySubmitMessage = {
        type: 'SUBMIT_QUERY',
        payload: {
          query: '',
          providerIds: ['chatgpt'],
        },
      };

      const response = await handleMessage(message);
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should handle message with all default providers', async () => {
      const allProviderIds = DEFAULT_PROVIDERS.map((p) => p.id);

      const message: QuerySubmitMessage = {
        type: 'SUBMIT_QUERY',
        payload: {
          query: 'Test query for all providers',
          providerIds: allProviderIds,
        },
      };

      const response = await handleMessage(message);
      expect(response.success).toBe(true);
    });
  });

  describe('Popup provider selection flow', () => {
    it('should correctly extract selected providers for message', () => {
      const dom = new JSDOM(`<div id="container"></div>`);
      const container = dom.window.document.getElementById('container')!;

      // Render providers
      renderProviderCheckboxes(DEFAULT_PROVIDERS, container);

      // Select specific providers
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      (checkboxes[0] as HTMLInputElement).checked = true; // chatgpt
      (checkboxes[1] as HTMLInputElement).checked = true; // claude
      (checkboxes[2] as HTMLInputElement).checked = false; // gemini
      (checkboxes[3] as HTMLInputElement).checked = false; // grok

      const selectedIds = getSelectedProviderIds(container);
      expect(selectedIds).toEqual(['chatgpt', 'claude']);
    });

    it('should handle selecting all providers', () => {
      const dom = new JSDOM(`<div id="container"></div>`);
      const container = dom.window.document.getElementById('container')!;

      renderProviderCheckboxes(DEFAULT_PROVIDERS, container);

      // Select all
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach((cb) => {
        (cb as HTMLInputElement).checked = true;
      });

      const selectedIds = getSelectedProviderIds(container);
      expect(selectedIds).toHaveLength(DEFAULT_PROVIDERS.length);
    });
  });

  describe('End-to-end message flow simulation', () => {
    it('should simulate complete popup to background flow', async () => {
      // 1. User types query and selects providers in popup
      const query = 'Explain quantum computing';
      const selectedProviders = ['chatgpt', 'claude', 'gemini'];

      // 2. Popup creates message
      const message: QuerySubmitMessage = {
        type: 'SUBMIT_QUERY',
        payload: {
          query,
          providerIds: selectedProviders,
        },
      };

      // 3. Background handles message
      const response = await handleMessage(message);

      // 4. Verify success
      expect(response.success).toBe(true);
    });

    it('should reject submission when validation fails', async () => {
      // Test with whitespace-only query
      const message: QuerySubmitMessage = {
        type: 'SUBMIT_QUERY',
        payload: {
          query: '   \n\t  ',
          providerIds: ['chatgpt'],
        },
      };

      const response = await handleMessage(message);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Query cannot be empty');
    });
  });
});
