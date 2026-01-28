/**
 * Grok Content Script
 *
 * Handles input detection and query submission for Grok (grok.x.ai / x.com/i/grok)
 */

import { BaseProviderScript, ProviderDetectionConfig } from '../base-provider';

const config: ProviderDetectionConfig = {
  providerId: 'grok',
  inputSelectors: [
    // Primary textarea selector
    'textarea[placeholder*="Ask"]',
    'textarea[placeholder*="Message"]',
    // Generic fallbacks
    'main textarea',
    'form textarea',
    '[role="main"] textarea',
  ],
  submitSelectors: [
    // Submit button selectors
    'button[aria-label*="Send"]',
    'button[type="submit"]',
    'form button:last-of-type',
    // SVG icon button
    'button:has(svg[viewBox])',
  ],
  useContentEditable: true,
  inputAttributes: [
    { attr: 'placeholder', value: 'Ask anything' },
  ],
  customInputDetector: () => {
    // Grok typically uses a textarea
    const textarea = document.querySelector<HTMLTextAreaElement>('textarea');
    if (textarea) return textarea;

    // Fallback to contenteditable if no textarea found
    const contentEditable = document.querySelector<HTMLElement>(
      '[contenteditable="true"][data-placeholder]'
    );
    if (contentEditable) return contentEditable;

    return null;
  },
};

const grokScript = new BaseProviderScript(config);
grokScript.init();

// Export for testing
export { grokScript };
