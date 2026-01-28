/**
 * Claude Content Script
 *
 * Handles input detection and query submission for Claude (claude.ai)
 */

import { BaseProviderScript, ProviderDetectionConfig } from '../base-provider';

const config: ProviderDetectionConfig = {
  providerId: 'claude',
  inputSelectors: [
    // Primary contenteditable selector
    '[contenteditable="true"][data-placeholder]',
    'div[contenteditable="true"]',
    // ProseMirror editor (used by Claude)
    '.ProseMirror[contenteditable="true"]',
    'div.ProseMirror',
    // Fallback selectors
    '[role="textbox"]',
    'fieldset [contenteditable="true"]',
  ],
  submitSelectors: [
    // Submit button selectors
    'button[aria-label*="Send"]',
    'button[type="submit"]',
    'fieldset button:last-of-type',
    // Icon-based detection
    'button:has(svg)',
  ],
  useContentEditable: true,
  customInputDetector: () => {
    // Claude uses ProseMirror, look for that specifically
    const proseMirror = document.querySelector<HTMLElement>('.ProseMirror[contenteditable="true"]');
    if (proseMirror) return proseMirror;

    // Fallback to any contenteditable in a fieldset (Claude's form structure)
    const fieldsetInput = document.querySelector<HTMLElement>('fieldset [contenteditable="true"]');
    if (fieldsetInput) return fieldsetInput;

    return null;
  },
};

const claudeScript = new BaseProviderScript(config);
claudeScript.init();

// Export for testing
export { claudeScript };
