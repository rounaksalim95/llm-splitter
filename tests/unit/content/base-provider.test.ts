/**
 * Tests for BaseProviderScript
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseProviderScript, ProviderDetectionConfig } from '@content/base-provider';
import { MESSAGE_TYPES } from '@shared/constants';

/**
 * Helper to make an element "visible" in happy-dom
 */
function makeVisible(element: HTMLElement): void {
  // Mock getBoundingClientRect
  element.getBoundingClientRect = () => ({
    width: 400,
    height: 100,
    top: 600,
    left: 0,
    bottom: 700,
    right: 400,
    x: 0,
    y: 600,
    toJSON: () => ({}),
  });

  // Set inline styles to make getComputedStyle work
  element.style.display = 'block';
  element.style.visibility = 'visible';
  element.style.opacity = '1';
}

describe('BaseProviderScript', () => {
  let script: BaseProviderScript;
  let mockConfig: ProviderDetectionConfig;

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();

    mockConfig = {
      providerId: 'chatgpt',
      inputSelectors: ['#test-input', 'textarea.chat-input'],
      submitSelectors: ['#submit-btn', 'button[type="submit"]'],
      useContentEditable: true,
    };

    script = new BaseProviderScript(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with the given config', () => {
      expect(script).toBeInstanceOf(BaseProviderScript);
    });
  });

  describe('input detection', () => {
    it('should detect input by selector when element exists before init', async () => {
      // Add element BEFORE init
      const textarea = document.createElement('textarea');
      textarea.id = 'test-input';
      makeVisible(textarea);
      document.body.appendChild(textarea);

      await script.init();

      // Should detect immediately
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MESSAGE_TYPES.PROVIDER_READY,
        })
      );
    });

    it('should use custom input detector when provided', async () => {
      const customInput = document.createElement('div');
      customInput.id = 'custom-input';
      customInput.contentEditable = 'true';
      makeVisible(customInput);
      document.body.appendChild(customInput);

      const customConfig: ProviderDetectionConfig = {
        ...mockConfig,
        customInputDetector: () => customInput,
      };

      const customScript = new BaseProviderScript(customConfig);
      await customScript.init();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MESSAGE_TYPES.PROVIDER_READY,
        })
      );
    });

    it('should not notify ready when no input is found', async () => {
      // Don't add any input element
      await script.init();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not have called with PROVIDER_READY
      const calls = (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mock.calls;
      const readyCalls = calls.filter(
        (call) => call[0]?.type === MESSAGE_TYPES.PROVIDER_READY
      );
      expect(readyCalls.length).toBe(0);
    });
  });

  describe('executeQuery', () => {
    it('should set textarea value and dispatch events', async () => {
      const textarea = document.createElement('textarea');
      textarea.id = 'test-input';
      makeVisible(textarea);
      document.body.appendChild(textarea);

      // Track input events
      const inputHandler = vi.fn();
      textarea.addEventListener('input', inputHandler);

      await script.init();
      await new Promise((resolve) => setTimeout(resolve, 50));

      await script.executeQuery('test query');

      expect(textarea.value).toBe('test query');
      expect(inputHandler).toHaveBeenCalled();
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MESSAGE_TYPES.QUERY_SUBMITTED,
          payload: expect.objectContaining({
            providerId: 'chatgpt',
          }),
        })
      );
    });

    it('should click submit button when found', async () => {
      const textarea = document.createElement('textarea');
      textarea.id = 'test-input';
      makeVisible(textarea);
      document.body.appendChild(textarea);

      const submitBtn = document.createElement('button');
      submitBtn.id = 'submit-btn';
      makeVisible(submitBtn);
      const clickHandler = vi.fn();
      submitBtn.addEventListener('click', clickHandler);
      document.body.appendChild(submitBtn);

      await script.init();
      await new Promise((resolve) => setTimeout(resolve, 50));

      await script.executeQuery('test query');

      expect(clickHandler).toHaveBeenCalled();
    });

    it('should report failure when input not found', async () => {
      // Don't add any input element
      await script.init();

      // executeQuery should fail
      await script.executeQuery('test query');

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MESSAGE_TYPES.QUERY_FAILED,
          payload: expect.objectContaining({
            providerId: 'chatgpt',
            error: expect.any(String),
          }),
        })
      );
    });
  });

  describe('destroy', () => {
    it('should reset internal state', async () => {
      // Create input first so script becomes ready
      const textarea = document.createElement('textarea');
      textarea.id = 'test-input';
      makeVisible(textarea);
      document.body.appendChild(textarea);

      await script.init();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify it was ready
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MESSAGE_TYPES.PROVIDER_READY,
        })
      );

      // Clear mocks and destroy
      vi.clearAllMocks();
      script.destroy();

      // Trying to execute query after destroy should fail
      await script.executeQuery('test query');

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MESSAGE_TYPES.QUERY_FAILED,
        })
      );
    });
  });
});
