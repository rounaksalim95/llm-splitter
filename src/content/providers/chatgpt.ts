/**
 * ChatGPT Content Script
 *
 * Handles input detection and query submission for ChatGPT (chat.openai.com / chatgpt.com)
 */

import { BaseProviderScript, ProviderDetectionConfig } from '../base-provider';

const config: ProviderDetectionConfig = {
  providerId: 'chatgpt',
  inputSelectors: [
    // Primary textarea selector
    'textarea[data-id="root"]',
    '#prompt-textarea',
    'textarea[placeholder*="Send a message"]',
    'textarea[placeholder*="Message"]',
    // Fallback selectors
    'form textarea',
    'main textarea',
  ],
  submitSelectors: [
    // Submit button selectors
    'button[data-testid="send-button"]',
    'button[data-testid="fruitjuice-send-button"]',
    'form button[type="submit"]',
    'button[aria-label*="Send"]',
    // Icon-based button detection
    'button:has(svg[class*="send"])',
  ],
  useContentEditable: true,
  inputAttributes: [
    { attr: 'data-id', value: 'root' },
    { attr: 'id', value: 'prompt-textarea' },
  ],
};

const chatgptScript = new BaseProviderScript(config);
chatgptScript.init();

// Export for testing
export { chatgptScript };
