import type { InjectQueryMessage, MessageResponse, PingMessage, PongMessage } from '../shared/types';

/**
 * Tries multiple selectors in order and returns the first match
 */
function queryWithMultipleSelectors(selectors: string): Element | null {
  // Split by comma, but handle complex selectors with attribute values containing commas
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

/**
 * Waits for an element to appear in the DOM
 * Supports comma-separated selectors (tries each in order)
 */
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

/**
 * Enters text into a contenteditable element using execCommand for React compatibility
 */
function enterTextContentEditable(element: HTMLElement, text: string): void {
  element.focus();

  // First, clear all existing content to handle draft restoration
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  selection?.removeAllRanges();
  selection?.addRange(range);

  // Delete existing content first
  document.execCommand('delete', false);

  // Small delay to let React process the deletion
  // Then insert the new text
  const success = document.execCommand('insertText', false, text);

  if (!success) {
    // Fallback: manually clear and set content with proper events
    // First dispatch deleteContentBackward to signal content removal
    const deleteEvent = new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      inputType: 'deleteContentBackward',
    });
    element.dispatchEvent(deleteEvent);

    element.textContent = '';

    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      cancelable: false,
      inputType: 'deleteContentBackward',
    }));

    // Now insert the new text
    const beforeInputEvent = new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: text,
    });
    element.dispatchEvent(beforeInputEvent);

    element.textContent = text;

    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: false,
      inputType: 'insertText',
      data: text,
    });
    element.dispatchEvent(inputEvent);
  }

  // Move cursor to end of content
  range.selectNodeContents(element);
  range.collapse(false);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/**
 * Enters text into an input element with provider-specific handling
 */
function enterText(element: Element, text: string): void {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    // Standard textarea/input (ChatGPT, Grok)
    element.focus();
    element.value = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (element.getAttribute('contenteditable') === 'true') {
    // ContentEditable div (Claude) - use execCommand for React compatibility
    enterTextContentEditable(element as HTMLElement, text);
  } else if (element.classList.contains('ql-editor')) {
    // Quill editor (Gemini)
    element.focus();
    const htmlElement = element as HTMLElement;
    // Quill uses <p> tags for content
    htmlElement.innerHTML = `<p>${text}</p>`;
    element.dispatchEvent(new InputEvent('input', { bubbles: true }));
  } else {
    // Fallback: try setting textContent
    element.focus();
    const htmlElement = element as HTMLElement;
    htmlElement.textContent = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

/**
 * Waits for an element to become enabled (not disabled)
 */
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

/**
 * Dispatches Enter key events on an element
 */
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

/**
 * Clicks the submit button with retry logic
 */
async function clickSubmit(
  submitElement: Element,
  inputElement: Element | null
): Promise<boolean> {
  if (!(submitElement instanceof HTMLElement)) {
    return false;
  }

  // Wait for the button to become enabled
  const isEnabled = await waitForEnabled(submitElement);

  if (isEnabled) {
    submitElement.click();
    return true;
  }

  // Fallback: try pressing Enter on the input element
  if (inputElement) {
    dispatchEnterKey(inputElement);
    return true;
  }

  // Last resort: click anyway even if disabled
  submitElement.click();
  return false;
}

/**
 * Injects a query into the page's chat input and submits it
 */
async function injectQuery(
  query: string,
  inputSelector: string,
  submitSelector: string
): Promise<MessageResponse> {
  try {
    // Wait for input element
    const inputElement = await waitForElement(inputSelector);
    if (!inputElement) {
      return {
        success: false,
        error: `Input element not found: ${inputSelector}`,
      };
    }

    // Enter the query text
    enterText(inputElement, query);

    // Longer delay to let React reconcile (React sites need more time)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Wait for and click submit button
    const submitElement = await waitForElement(submitSelector);
    if (!submitElement) {
      return {
        success: false,
        error: `Submit button not found: ${submitSelector}`,
      };
    }

    // Click submit with retry logic
    await clickSubmit(submitElement, inputElement);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener(
  (
    message: InjectQueryMessage | PingMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse | PongMessage) => void
  ) => {
    if (message.type === 'PING') {
      sendResponse({ type: 'PONG' });
      return false; // Sync response
    }
    if (message.type === 'INJECT_QUERY') {
      const { query, inputSelector, submitSelector } = message.payload;
      injectQuery(query, inputSelector, submitSelector)
        .then(sendResponse)
        .catch((error) => {
          // Ensure we always send a response to prevent "channel closed" errors
          sendResponse({
            success: false,
            error: `Injection failed: ${error instanceof Error ? error.message : String(error)}`,
          });
        });
      return true; // Keep message channel open for async response
    }
    return false;
  }
);
