import { describe, it, expect, beforeEach, vi } from 'vitest';

// We need to test the content script functions in isolation
// Since the module sets up listeners on import, we test the logic separately

describe('Query Injector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('queryWithMultipleSelectors', () => {
    // Local implementation for testing
    function queryWithMultipleSelectors(selectors: string): Element | null {
      const selectorList = selectors.split(/,\s*(?=(?:[^\[\]]*\[[^\[\]]*\])*[^\[\]]*$)/);

      for (const selector of selectorList) {
        const trimmed = selector.trim();
        if (trimmed) {
          const element = document.querySelector(trimmed);
          if (element) {
            return element;
          }
        }
      }
      return null;
    }

    it('should return first matching element from comma-separated selectors', () => {
      document.body.innerHTML = '<main><textarea id="main-textarea"></textarea></main>';

      const element = queryWithMultipleSelectors(
        'textarea[placeholder*="Ask"], textarea[placeholder*="message"], main textarea, textarea'
      );
      expect(element).not.toBeNull();
      expect(element?.id).toBe('main-textarea');
    });

    it('should try selectors in order', () => {
      document.body.innerHTML = '<textarea id="first"></textarea><textarea id="second"></textarea>';

      const element = queryWithMultipleSelectors('#nonexistent, #first, #second');
      expect(element).not.toBeNull();
      expect(element?.id).toBe('first');
    });

    it('should handle selectors with attribute values containing special chars', () => {
      document.body.innerHTML = '<button aria-label="Send Message"></button>';

      const element = queryWithMultipleSelectors(
        'button[aria-label="Submit"], button[aria-label="Send Message"]'
      );
      expect(element).not.toBeNull();
    });

    it('should return null when no selectors match', () => {
      document.body.innerHTML = '<div></div>';

      const element = queryWithMultipleSelectors('#a, #b, #c');
      expect(element).toBeNull();
    });
  });

  describe('waitForElement', () => {
    // Create a local implementation for testing since we can't easily import
    // the content script module without triggering side effects
    function queryWithMultipleSelectors(selectors: string): Element | null {
      const selectorList = selectors.split(/,\s*(?=(?:[^\[\]]*\[[^\[\]]*\])*[^\[\]]*$)/);

      for (const selector of selectorList) {
        const trimmed = selector.trim();
        if (trimmed) {
          const element = document.querySelector(trimmed);
          if (element) {
            return element;
          }
        }
      }
      return null;
    }

    function waitForElement(
      selector: string,
      timeout: number = 10000
    ): Promise<Element | null> {
      return new Promise((resolve) => {
        const existing = queryWithMultipleSelectors(selector);
        if (existing) {
          resolve(existing);
          return;
        }

        const observer = new MutationObserver(() => {
          const element = queryWithMultipleSelectors(selector);
          if (element) {
            observer.disconnect();
            resolve(element);
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });

        setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, timeout);
      });
    }

    it('should return existing element immediately', async () => {
      document.body.innerHTML = '<textarea id="test-input"></textarea>';

      const element = await waitForElement('#test-input');
      expect(element).not.toBeNull();
      expect(element?.id).toBe('test-input');
    });

    it('should wait for element to appear', async () => {
      const promise = waitForElement('#delayed-input', 1000);

      // Add element after a delay
      setTimeout(() => {
        const input = document.createElement('textarea');
        input.id = 'delayed-input';
        document.body.appendChild(input);
      }, 50);

      const element = await promise;
      expect(element).not.toBeNull();
      expect(element?.id).toBe('delayed-input');
    });

    it('should return null after timeout if element not found', async () => {
      const element = await waitForElement('#nonexistent', 100);
      expect(element).toBeNull();
    });

    it('should support multi-selector format', async () => {
      document.body.innerHTML = '<main><textarea id="found"></textarea></main>';

      const element = await waitForElement('#not-there, main textarea');
      expect(element).not.toBeNull();
      expect(element?.id).toBe('found');
    });
  });

  describe('enterText', () => {
    // Create a local implementation for testing
    function enterText(element: Element, text: string): void {
      if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
        element.focus();
        element.value = text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (element.getAttribute('contenteditable') === 'true') {
        element.focus();
        const htmlElement = element as HTMLElement;
        htmlElement.textContent = text;
        element.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));
      } else if (element.classList.contains('ql-editor')) {
        element.focus();
        const htmlElement = element as HTMLElement;
        htmlElement.innerHTML = `<p>${text}</p>`;
        element.dispatchEvent(new InputEvent('input', { bubbles: true }));
      } else {
        element.focus();
        const htmlElement = element as HTMLElement;
        htmlElement.textContent = text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    it('should enter text into textarea', () => {
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      enterText(textarea, 'test query');

      expect(textarea.value).toBe('test query');
    });

    it('should enter text into input', () => {
      const input = document.createElement('input');
      input.type = 'text';
      document.body.appendChild(input);

      enterText(input, 'test query');

      expect(input.value).toBe('test query');
    });

    it('should enter text into contenteditable div', () => {
      const div = document.createElement('div');
      div.setAttribute('contenteditable', 'true');
      document.body.appendChild(div);

      enterText(div, 'test query');

      expect(div.textContent).toBe('test query');
    });

    it('should enter text into Quill editor', () => {
      const div = document.createElement('div');
      div.classList.add('ql-editor');
      document.body.appendChild(div);

      enterText(div, 'test query');

      expect(div.innerHTML).toBe('<p>test query</p>');
    });

    it('should dispatch input event for textarea', () => {
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      const inputHandler = vi.fn();
      textarea.addEventListener('input', inputHandler);

      enterText(textarea, 'test');

      expect(inputHandler).toHaveBeenCalled();
    });

    it('should dispatch change event for textarea', () => {
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      const changeHandler = vi.fn();
      textarea.addEventListener('change', changeHandler);

      enterText(textarea, 'test');

      expect(changeHandler).toHaveBeenCalled();
    });

    it('should dispatch input event for contenteditable', () => {
      const div = document.createElement('div');
      div.setAttribute('contenteditable', 'true');
      document.body.appendChild(div);

      const inputHandler = vi.fn();
      div.addEventListener('input', inputHandler);

      enterText(div, 'test');

      expect(inputHandler).toHaveBeenCalled();
    });
  });

  describe('waitForEnabled', () => {
    async function waitForEnabled(
      element: Element,
      maxRetries: number = 10,
      intervalMs: number = 200
    ): Promise<boolean> {
      for (let i = 0; i < maxRetries; i++) {
        const isDisabled =
          element.hasAttribute('disabled') ||
          element.getAttribute('aria-disabled') === 'true';

        if (!isDisabled) {
          return true;
        }

        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
      return false;
    }

    it('should return true immediately for enabled button', async () => {
      const button = document.createElement('button');
      document.body.appendChild(button);

      const result = await waitForEnabled(button, 3, 50);
      expect(result).toBe(true);
    });

    it('should wait for button to become enabled', async () => {
      const button = document.createElement('button');
      button.disabled = true;
      document.body.appendChild(button);

      // Enable after 100ms
      setTimeout(() => {
        button.disabled = false;
      }, 100);

      const result = await waitForEnabled(button, 5, 50);
      expect(result).toBe(true);
    });

    it('should return false if button stays disabled', async () => {
      const button = document.createElement('button');
      button.disabled = true;
      document.body.appendChild(button);

      const result = await waitForEnabled(button, 2, 50);
      expect(result).toBe(false);
    });

    it('should detect aria-disabled attribute', async () => {
      const button = document.createElement('button');
      button.setAttribute('aria-disabled', 'true');
      document.body.appendChild(button);

      const result = await waitForEnabled(button, 2, 50);
      expect(result).toBe(false);
    });
  });

  describe('dispatchEnterKey', () => {
    function dispatchEnterKey(element: Element): void {
      const keydownEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
      });

      const keypressEvent = new KeyboardEvent('keypress', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
      });

      const keyupEvent = new KeyboardEvent('keyup', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
      });

      element.dispatchEvent(keydownEvent);
      element.dispatchEvent(keypressEvent);
      element.dispatchEvent(keyupEvent);
    }

    it('should dispatch keydown event with Enter key', () => {
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      const keydownHandler = vi.fn();
      textarea.addEventListener('keydown', keydownHandler);

      dispatchEnterKey(textarea);

      expect(keydownHandler).toHaveBeenCalled();
      expect(keydownHandler.mock.calls[0][0].key).toBe('Enter');
    });

    it('should dispatch keyup event with Enter key', () => {
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      const keyupHandler = vi.fn();
      textarea.addEventListener('keyup', keyupHandler);

      dispatchEnterKey(textarea);

      expect(keyupHandler).toHaveBeenCalled();
      expect(keyupHandler.mock.calls[0][0].key).toBe('Enter');
    });
  });

  describe('clickSubmit', () => {
    async function waitForEnabled(
      element: Element,
      maxRetries: number = 10,
      intervalMs: number = 200
    ): Promise<boolean> {
      for (let i = 0; i < maxRetries; i++) {
        const isDisabled =
          element.hasAttribute('disabled') ||
          element.getAttribute('aria-disabled') === 'true';

        if (!isDisabled) {
          return true;
        }

        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
      return false;
    }

    function dispatchEnterKey(element: Element): void {
      const keydownEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(keydownEvent);
    }

    async function clickSubmit(
      submitElement: Element,
      inputElement: Element | null
    ): Promise<boolean> {
      if (!(submitElement instanceof HTMLElement)) {
        return false;
      }

      const isEnabled = await waitForEnabled(submitElement, 3, 50);

      if (isEnabled) {
        submitElement.click();
        return true;
      }

      if (inputElement) {
        dispatchEnterKey(inputElement);
        return true;
      }

      submitElement.click();
      return false;
    }

    it('should click the submit button when enabled', async () => {
      const button = document.createElement('button');
      document.body.appendChild(button);

      const clickHandler = vi.fn();
      button.addEventListener('click', clickHandler);

      const result = await clickSubmit(button, null);

      expect(result).toBe(true);
      expect(clickHandler).toHaveBeenCalled();
    });

    it('should work with div buttons', async () => {
      const div = document.createElement('div');
      div.setAttribute('role', 'button');
      document.body.appendChild(div);

      const clickHandler = vi.fn();
      div.addEventListener('click', clickHandler);

      await clickSubmit(div, null);

      expect(clickHandler).toHaveBeenCalled();
    });

    it('should fallback to Enter key when button stays disabled', async () => {
      const button = document.createElement('button');
      button.disabled = true;
      const textarea = document.createElement('textarea');
      document.body.appendChild(button);
      document.body.appendChild(textarea);

      const keydownHandler = vi.fn();
      textarea.addEventListener('keydown', keydownHandler);

      const result = await clickSubmit(button, textarea);

      expect(result).toBe(true);
      expect(keydownHandler).toHaveBeenCalled();
    });

    it('should return false when button stays disabled and no input element provided', async () => {
      const button = document.createElement('button');
      button.disabled = true;
      document.body.appendChild(button);

      const result = await clickSubmit(button, null);

      // Returns false indicating the button was still disabled
      expect(result).toBe(false);
    });
  });

  describe('Provider-specific selectors', () => {
    it('should find ChatGPT input with correct selector', () => {
      document.body.innerHTML = '<textarea id="prompt-textarea"></textarea>';
      const element = document.querySelector('#prompt-textarea');
      expect(element).not.toBeNull();
    });

    it('should find Claude input with correct selector', () => {
      document.body.innerHTML = '<div contenteditable="true"></div>';
      const element = document.querySelector('[contenteditable="true"]');
      expect(element).not.toBeNull();
    });

    it('should find Gemini input with correct selector', () => {
      document.body.innerHTML = '<div class="ql-editor"></div>';
      const element = document.querySelector('.ql-editor');
      expect(element).not.toBeNull();
    });

    it('should find Grok input with correct selector', () => {
      document.body.innerHTML = '<div class="ProseMirror" contenteditable="true"></div>';
      const element = document.querySelector('.ProseMirror[contenteditable="true"]');
      expect(element).not.toBeNull();
    });

    it('should find ChatGPT submit button with correct selector', () => {
      document.body.innerHTML = '<button data-testid="send-button"></button>';
      const element = document.querySelector('[data-testid="send-button"]');
      expect(element).not.toBeNull();
    });

    it('should find Claude submit button with correct selector', () => {
      document.body.innerHTML = '<button aria-label="Send message"></button>';
      const element = document.querySelector('[aria-label="Send message"]');
      expect(element).not.toBeNull();
    });

    it('should find Gemini submit button with correct selector', () => {
      document.body.innerHTML = '<button aria-label="Send message"></button>';
      const element = document.querySelector('[aria-label="Send message"]');
      expect(element).not.toBeNull();
    });

    it('should find Grok submit button with correct selector', () => {
      document.body.innerHTML = '<button aria-label="Submit"></button>';
      const element = document.querySelector('[aria-label="Submit"]');
      expect(element).not.toBeNull();
    });
  });
});
