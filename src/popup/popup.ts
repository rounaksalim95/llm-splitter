/**
 * LLM Splitter Popup Script
 *
 * Handles the popup UI interactions:
 * - Loading and displaying provider options
 * - Capturing user query input
 * - Sending queries to the background script
 */

import type { UserSettings, ProviderConfig, ProviderId } from '@shared/types';
import { loadSettings, createMessage, getEffectiveTheme } from '@shared/utils';
import { MESSAGE_TYPES } from '@shared/constants';

/**
 * DOM element references
 */
interface PopupElements {
  queryInput: HTMLTextAreaElement;
  providersList: HTMLElement;
  submitButton: HTMLButtonElement;
  settingsButton: HTMLButtonElement;
  footerText: HTMLParagraphElement;
}

/**
 * Current state of the popup
 */
interface PopupState {
  settings: UserSettings | null;
  selectedProviders: Set<ProviderId>;
  isLoading: boolean;
}

const state: PopupState = {
  settings: null,
  selectedProviders: new Set(),
  isLoading: false,
};

/**
 * Gets references to all required DOM elements
 */
function getElements(): PopupElements {
  const queryInput = document.getElementById('query-input') as HTMLTextAreaElement;
  const providersList = document.getElementById('providers-list') as HTMLElement;
  const submitButton = document.getElementById('submit-btn') as HTMLButtonElement;
  const settingsButton = document.getElementById('settings-btn') as HTMLButtonElement;
  const footerText = document.querySelector('.footer-text') as HTMLParagraphElement;

  if (!queryInput || !providersList || !submitButton || !settingsButton || !footerText) {
    throw new Error('Required DOM elements not found');
  }

  return { queryInput, providersList, submitButton, settingsButton, footerText };
}

/**
 * Applies the appropriate theme based on user settings
 */
function applyTheme(theme: UserSettings['theme']): void {
  const effectiveTheme = getEffectiveTheme(theme);
  document.documentElement.setAttribute('data-theme', effectiveTheme);
}

/**
 * Creates a provider chip element
 */
function createProviderChip(provider: ProviderConfig): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = `provider-chip${provider.enabled ? ' selected' : ''}`;
  label.setAttribute('tabindex', '0');
  label.setAttribute('role', 'checkbox');
  label.setAttribute('aria-checked', String(provider.enabled));

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = provider.enabled;
  checkbox.id = `provider-${provider.id}`;

  const indicator = document.createElement('span');
  indicator.className = 'provider-indicator';
  indicator.style.backgroundColor = provider.color;

  const name = document.createElement('span');
  name.className = 'provider-name';
  name.textContent = provider.name;

  label.appendChild(checkbox);
  label.appendChild(indicator);
  label.appendChild(name);

  // Handle checkbox changes
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      state.selectedProviders.add(provider.id);
      label.classList.add('selected');
    } else {
      state.selectedProviders.delete(provider.id);
      label.classList.remove('selected');
    }
    label.setAttribute('aria-checked', String(checkbox.checked));
    updateSubmitButtonState();
  });

  // Handle keyboard navigation
  label.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      checkbox.click();
    }
  });

  return label;
}

/**
 * Renders the provider list
 */
function renderProviders(elements: PopupElements): void {
  if (!state.settings) return;

  elements.providersList.innerHTML = '';
  state.selectedProviders.clear();

  for (const provider of state.settings.providers) {
    const chip = createProviderChip(provider);
    elements.providersList.appendChild(chip);

    if (provider.enabled) {
      state.selectedProviders.add(provider.id);
    }
  }
}

/**
 * Updates the submit button state based on current input
 */
function updateSubmitButtonState(): void {
  const elements = getElements();
  const query = elements.queryInput.value.trim();
  const hasProviders = state.selectedProviders.size > 0;
  const hasQuery = query.length > 0;

  elements.submitButton.disabled = !hasProviders || !hasQuery || state.isLoading;

  // Update footer text with helpful guidance
  if (!hasProviders) {
    elements.footerText.textContent = 'Select at least one provider';
  } else if (!hasQuery) {
    elements.footerText.textContent = 'Enter a query to begin';
  } else {
    const count = state.selectedProviders.size;
    elements.footerText.textContent = `Ready to send to ${count} provider${count !== 1 ? 's' : ''}`;
  }
}

/**
 * Handles form submission
 */
async function handleSubmit(): Promise<void> {
  const elements = getElements();
  const query = elements.queryInput.value.trim();

  if (!query || state.selectedProviders.size === 0 || state.isLoading) {
    return;
  }

  state.isLoading = true;
  elements.submitButton.disabled = true;
  elements.footerText.textContent = 'Opening providers...';

  try {
    // Update settings with currently selected providers
    if (state.settings) {
      state.settings.providers = state.settings.providers.map((p) => ({
        ...p,
        enabled: state.selectedProviders.has(p.id),
      }));
    }

    // Send message to background script
    const message = createMessage(MESSAGE_TYPES.SUBMIT_QUERY, { query });
    await chrome.runtime.sendMessage(message);

    // Close popup after successful submission
    window.close();
  } catch (error) {
    console.error('[LLM Splitter] Failed to submit query:', error);
    elements.footerText.textContent = 'Failed to open providers. Please try again.';
    state.isLoading = false;
    updateSubmitButtonState();
  }
}

/**
 * Opens the options page
 */
function openSettings(): void {
  chrome.runtime.openOptionsPage();
}

/**
 * Initializes the popup
 */
async function init(): Promise<void> {
  try {
    const elements = getElements();

    // Load settings
    state.settings = await loadSettings();
    applyTheme(state.settings.theme);

    // Render UI
    renderProviders(elements);

    // Set up event listeners
    elements.queryInput.addEventListener('input', updateSubmitButtonState);
    elements.submitButton.addEventListener('click', handleSubmit);
    elements.settingsButton.addEventListener('click', openSettings);

    // Handle Enter key in textarea (Ctrl+Enter or Cmd+Enter to submit)
    elements.queryInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    });

    // Initial state update
    updateSubmitButtonState();

    // Focus query input
    elements.queryInput.focus();
  } catch (error) {
    console.error('[LLM Splitter] Failed to initialize popup:', error);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
