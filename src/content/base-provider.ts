/**
 * Base Provider Content Script
 *
 * Provides a robust foundation for detecting and interacting with
 * LLM provider input fields using MutationObserver for dynamic detection.
 */

import type { ProviderId, InputDetectionResult, SubmitButtonDetectionResult } from '@shared/types';
import { createMessage } from '@shared/utils';
import { MESSAGE_TYPES, TIMING } from '@shared/constants';

/**
 * Configuration for a provider's input detection
 */
export interface ProviderDetectionConfig {
  providerId: ProviderId;
  /** Selectors to try for finding the input element */
  inputSelectors: string[];
  /** Selectors to try for finding the submit button */
  submitSelectors: string[];
  /** Additional attributes that might identify an input */
  inputAttributes?: { attr: string; value: string }[];
  /** Whether to use contenteditable detection */
  useContentEditable?: boolean;
  /** Custom input detection function */
  customInputDetector?: () => HTMLElement | null;
  /** Custom submit function */
  customSubmit?: (input: HTMLElement) => Promise<void>;
}

/**
 * Base class for provider content scripts
 */
export class BaseProviderScript {
  protected config: ProviderDetectionConfig;
  protected observer: MutationObserver | null = null;
  protected inputElement: HTMLElement | null = null;
  protected isReady = false;

  constructor(config: ProviderDetectionConfig) {
    this.config = config;
  }

  /**
   * Initializes the provider script
   */
  async init(): Promise<void> {
    console.log(`[LLM Splitter] Initializing ${this.config.providerId} content script`);

    // Start observing for input element
    this.startObserving();

    // Check for pending query
    await this.checkForPendingQuery();
  }

  /**
   * Starts observing DOM for input elements
   */
  protected startObserving(): void {
    // First try to find existing element
    const input = this.detectInput();
    if (input.found && input.element) {
      this.inputElement = input.element;
      this.isReady = true;
      this.notifyReady();
      return;
    }

    // Set up MutationObserver for dynamic detection
    this.observer = new MutationObserver(() => {
      if (this.isReady) return;

      const input = this.detectInput();
      if (input.found && input.element) {
        this.inputElement = input.element;
        this.isReady = true;
        this.notifyReady();
        this.observer?.disconnect();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'disabled', 'contenteditable'],
    });

    // Timeout fallback
    setTimeout(() => {
      if (!this.isReady) {
        console.warn(`[LLM Splitter] ${this.config.providerId}: Input detection timed out`);
        this.observer?.disconnect();
      }
    }, TIMING.INPUT_DETECTION_TIMEOUT);
  }

  /**
   * Detects the input element using multiple strategies
   */
  protected detectInput(): InputDetectionResult {
    // Try custom detector first
    if (this.config.customInputDetector) {
      const element = this.config.customInputDetector();
      if (element) {
        return { found: true, element, type: this.getInputType(element) };
      }
    }

    // Try selectors
    for (const selector of this.config.inputSelectors) {
      try {
        const element = document.querySelector<HTMLElement>(selector);
        if (element && this.isVisibleAndEnabled(element)) {
          return { found: true, element, type: this.getInputType(element) };
        }
      } catch (e) {
        // Invalid selector, skip
      }
    }

    // Try attribute-based detection
    if (this.config.inputAttributes) {
      for (const { attr, value } of this.config.inputAttributes) {
        const element = document.querySelector<HTMLElement>(`[${attr}="${value}"]`);
        if (element && this.isVisibleAndEnabled(element)) {
          return { found: true, element, type: this.getInputType(element) };
        }
      }
    }

    // Try contenteditable detection
    if (this.config.useContentEditable) {
      const editables = document.querySelectorAll<HTMLElement>('[contenteditable="true"]');
      for (const element of editables) {
        if (this.isVisibleAndEnabled(element) && this.looksLikeMainInput(element)) {
          return { found: true, element, type: 'contenteditable' };
        }
      }
    }

    return { found: false, type: 'unknown' };
  }

  /**
   * Detects the submit button
   */
  protected detectSubmitButton(): SubmitButtonDetectionResult {
    for (const selector of this.config.submitSelectors) {
      try {
        const element = document.querySelector<HTMLElement>(selector);
        if (element && this.isVisibleAndEnabled(element)) {
          return { found: true, element, type: 'button' };
        }
      } catch (e) {
        // Invalid selector, skip
      }
    }

    return { found: false, type: 'unknown' };
  }

  /**
   * Checks if an element is visible and enabled
   */
  protected isVisibleAndEnabled(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      rect.width > 0 &&
      rect.height > 0 &&
      !element.hasAttribute('disabled')
    );
  }

  /**
   * Heuristic to determine if element looks like a main chat input
   */
  protected looksLikeMainInput(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Main input is usually at the bottom of the page
    const isNearBottom = rect.top > viewportHeight * 0.5;

    // Main input is usually reasonably sized
    const hasReasonableSize = rect.width > 200 && rect.height > 30;

    return isNearBottom && hasReasonableSize;
  }

  /**
   * Gets the type of input element
   */
  protected getInputType(element: HTMLElement): InputDetectionResult['type'] {
    if (element.tagName === 'TEXTAREA') return 'textarea';
    if (element.tagName === 'INPUT') return 'input';
    if (element.getAttribute('contenteditable') === 'true') return 'contenteditable';
    return 'unknown';
  }

  /**
   * Sets the value of the input element
   */
  protected async setInputValue(value: string): Promise<void> {
    if (!this.inputElement) {
      throw new Error('Input element not found');
    }

    const type = this.getInputType(this.inputElement);

    if (type === 'contenteditable') {
      // For contenteditable, we need to set innerHTML and dispatch events
      this.inputElement.focus();
      this.inputElement.innerHTML = '';

      // Use document.execCommand for better compatibility with React/Vue
      document.execCommand('insertText', false, value);

      // Also set textContent as fallback
      if (!this.inputElement.textContent) {
        this.inputElement.textContent = value;
      }
    } else {
      // For textarea/input, set value property
      (this.inputElement as HTMLInputElement | HTMLTextAreaElement).value = value;
    }

    // Dispatch input events to trigger any framework bindings
    this.inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    this.inputElement.dispatchEvent(new Event('change', { bubbles: true }));

    // Small delay to allow frameworks to process
    await new Promise((resolve) => setTimeout(resolve, TIMING.SUBMIT_DELAY));
  }

  /**
   * Submits the query
   */
  protected async submit(): Promise<void> {
    if (this.config.customSubmit && this.inputElement) {
      await this.config.customSubmit(this.inputElement);
      return;
    }

    // Try to find and click submit button
    const submitResult = this.detectSubmitButton();
    if (submitResult.found && submitResult.element) {
      submitResult.element.click();
      return;
    }

    // Fallback: simulate Enter key
    if (this.inputElement) {
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
      });
      this.inputElement.dispatchEvent(enterEvent);
    }
  }

  /**
   * Checks for and processes any pending query
   */
  protected async checkForPendingQuery(): Promise<void> {
    const storageKey = `pending_query_${this.config.providerId}`;

    try {
      const result = await chrome.storage.local.get(storageKey);
      const query = result[storageKey];

      if (query) {
        // Clear the pending query immediately
        await chrome.storage.local.remove(storageKey);

        // Wait for input to be ready
        await this.waitForReady();

        // Execute the query
        await this.executeQuery(query);
      }
    } catch (error) {
      console.error(`[LLM Splitter] ${this.config.providerId}: Error checking pending query:`, error);
    }
  }

  /**
   * Waits for the input element to be ready
   */
  protected waitForReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isReady) {
        resolve();
        return;
      }

      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (this.isReady) {
          clearInterval(checkInterval);
          resolve();
        } else if (Date.now() - startTime > TIMING.PAGE_READY_TIMEOUT) {
          clearInterval(checkInterval);
          reject(new Error('Timeout waiting for input'));
        }
      }, TIMING.INPUT_DETECTION_INTERVAL);
    });
  }

  /**
   * Executes a query by setting the input value and submitting
   */
  async executeQuery(query: string): Promise<void> {
    try {
      console.log(`[LLM Splitter] ${this.config.providerId}: Executing query`);

      await this.setInputValue(query);
      await this.submit();

      // Notify background script of success
      chrome.runtime.sendMessage(
        createMessage(MESSAGE_TYPES.QUERY_SUBMITTED, {
          providerId: this.config.providerId,
        })
      );
    } catch (error) {
      console.error(`[LLM Splitter] ${this.config.providerId}: Failed to execute query:`, error);

      // Notify background script of failure
      chrome.runtime.sendMessage(
        createMessage(MESSAGE_TYPES.QUERY_FAILED, {
          providerId: this.config.providerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      );
    }
  }

  /**
   * Notifies background script that provider is ready
   */
  protected notifyReady(): void {
    console.log(`[LLM Splitter] ${this.config.providerId}: Ready`);
    chrome.runtime.sendMessage(
      createMessage(MESSAGE_TYPES.PROVIDER_READY, {
        providerId: this.config.providerId,
      })
    );
  }

  /**
   * Cleans up resources
   */
  destroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.inputElement = null;
    this.isReady = false;
  }
}
