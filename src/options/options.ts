/**
 * LLM Splitter Options Page Script
 *
 * Handles the options/settings UI:
 * - Loading and displaying current settings
 * - Saving user preferences
 */

import type { UserSettings, ProviderConfig, ProviderId } from '@shared/types';
import { loadSettings, saveSettings, getEffectiveTheme } from '@shared/utils';

/**
 * Current state of the options page
 */
interface OptionsState {
  settings: UserSettings | null;
  isDirty: boolean;
}

const state: OptionsState = {
  settings: null,
  isDirty: false,
};

/**
 * Applies the appropriate theme based on user settings
 */
function applyTheme(theme: UserSettings['theme']): void {
  const effectiveTheme = getEffectiveTheme(theme);
  document.documentElement.setAttribute('data-theme', effectiveTheme);
}

/**
 * Creates a provider card element
 */
function createProviderCard(provider: ProviderConfig): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = `provider-card${provider.enabled ? ' selected' : ''}`;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = provider.enabled;
  checkbox.id = `provider-${provider.id}`;

  const info = document.createElement('div');
  info.className = 'provider-info';

  const name = document.createElement('div');
  name.className = 'provider-name';
  name.textContent = provider.name;

  const url = document.createElement('div');
  url.className = 'provider-url';
  url.textContent = provider.url;

  info.appendChild(name);
  info.appendChild(url);

  const color = document.createElement('span');
  color.className = 'provider-color';
  color.style.backgroundColor = provider.color;

  label.appendChild(checkbox);
  label.appendChild(info);
  label.appendChild(color);

  checkbox.addEventListener('change', () => {
    label.classList.toggle('selected', checkbox.checked);
    updateProviderEnabled(provider.id, checkbox.checked);
  });

  return label;
}

/**
 * Updates a provider's enabled state in the settings
 */
function updateProviderEnabled(providerId: ProviderId, enabled: boolean): void {
  if (!state.settings) return;

  state.settings.providers = state.settings.providers.map((p) =>
    p.id === providerId ? { ...p, enabled } : p
  );
  state.isDirty = true;
}

/**
 * Renders the providers list
 */
function renderProviders(): void {
  if (!state.settings) return;

  const container = document.getElementById('providers-list');
  if (!container) return;

  container.innerHTML = '';

  for (const provider of state.settings.providers) {
    const card = createProviderCard(provider);
    container.appendChild(card);
  }
}

/**
 * Sets up the layout options radio buttons
 */
function setupLayoutOptions(): void {
  if (!state.settings) return;

  const radios = document.querySelectorAll<HTMLInputElement>('input[name="layout"]');

  radios.forEach((radio) => {
    radio.checked = radio.value === state.settings?.windowLayout.arrangement;

    radio.addEventListener('change', () => {
      if (!state.settings) return;
      state.settings.windowLayout.arrangement = radio.value as 'grid' | 'horizontal' | 'vertical';
      state.isDirty = true;
    });
  });
}

/**
 * Sets up the theme options radio buttons
 */
function setupThemeOptions(): void {
  if (!state.settings) return;

  const radios = document.querySelectorAll<HTMLInputElement>('input[name="theme"]');

  radios.forEach((radio) => {
    radio.checked = radio.value === state.settings?.theme;

    radio.addEventListener('change', () => {
      if (!state.settings) return;
      state.settings.theme = radio.value as UserSettings['theme'];
      applyTheme(state.settings.theme);
      state.isDirty = true;
    });
  });
}

/**
 * Shows a status message
 */
function showStatus(message: string, type: 'success' | 'error'): void {
  const statusEl = document.getElementById('status-message');
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;

  // Clear message after 3 seconds
  setTimeout(() => {
    statusEl.textContent = '';
    statusEl.className = 'status-message';
  }, 3000);
}

/**
 * Handles save button click
 */
async function handleSave(): Promise<void> {
  if (!state.settings) return;

  try {
    await saveSettings(state.settings);
    state.isDirty = false;
    showStatus('Settings saved successfully', 'success');
  } catch (error) {
    console.error('[LLM Splitter] Failed to save settings:', error);
    showStatus('Failed to save settings', 'error');
  }
}

/**
 * Initializes the options page
 */
async function init(): Promise<void> {
  try {
    // Load settings
    state.settings = await loadSettings();
    applyTheme(state.settings.theme);

    // Render UI
    renderProviders();
    setupLayoutOptions();
    setupThemeOptions();

    // Set up save button
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', handleSave);
    }

    // Warn about unsaved changes
    window.addEventListener('beforeunload', (e) => {
      if (state.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  } catch (error) {
    console.error('[LLM Splitter] Failed to initialize options:', error);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
