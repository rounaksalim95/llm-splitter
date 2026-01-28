/**
 * Gemini Content Script
 *
 * Handles input detection and query submission for Google Gemini (gemini.google.com)
 */

import { BaseProviderScript, ProviderDetectionConfig } from '../base-provider';

const config: ProviderDetectionConfig = {
  providerId: 'gemini',
  inputSelectors: [
    // Primary rich text editor
    '.ql-editor[contenteditable="true"]',
    'rich-textarea [contenteditable="true"]',
    // Fallback selectors
    '[data-placeholder*="Enter a prompt"]',
    'div[contenteditable="true"][aria-label*="prompt"]',
    // Generic fallbacks
    '.input-area [contenteditable="true"]',
    'form [contenteditable="true"]',
  ],
  submitSelectors: [
    // Submit button selectors
    'button[aria-label*="Send"]',
    'button[aria-label*="Submit"]',
    '.send-button',
    // Mat button (Angular Material)
    'button.mat-mdc-icon-button[aria-label*="Send"]',
    'button.mdc-icon-button',
  ],
  useContentEditable: true,
  inputAttributes: [
    { attr: 'aria-label', value: 'Enter a prompt here' },
  ],
  customInputDetector: () => {
    // Gemini uses a rich text editor, try to find the Quill editor first
    const quillEditor = document.querySelector<HTMLElement>('.ql-editor[contenteditable="true"]');
    if (quillEditor) return quillEditor;

    // Try rich-textarea component
    const richTextarea = document.querySelector<HTMLElement>('rich-textarea [contenteditable="true"]');
    if (richTextarea) return richTextarea;

    // Look for any contenteditable with prompt-related aria-label
    const promptInput = document.querySelector<HTMLElement>('[contenteditable="true"][aria-label*="prompt" i]');
    if (promptInput) return promptInput;

    return null;
  },
};

const geminiScript = new BaseProviderScript(config);
geminiScript.init();

// Export for testing
export { geminiScript };
