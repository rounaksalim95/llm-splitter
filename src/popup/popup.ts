import type { Provider, QuerySubmitMessage, MessageResponse } from '../shared/types';
import { getStorageData, addQueryToHistory } from '../shared/storage';

const MAX_DISPLAY_LENGTH = 50;

/**
 * Renders provider checkboxes in the container
 */
export function renderProviderCheckboxes(
  providers: Provider[],
  container: HTMLElement
): void {
  container.innerHTML = '';

  providers.forEach((provider) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'provider-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `provider-${provider.id}`;
    checkbox.value = provider.id;
    checkbox.checked = provider.enabled;

    const label = document.createElement('label');
    label.htmlFor = `provider-${provider.id}`;
    label.textContent = provider.name;

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);
    container.appendChild(wrapper);
  });
}

/**
 * Renders query history in the select element
 */
export function renderQueryHistory(
  history: string[],
  select: HTMLSelectElement
): void {
  // Clear existing options except placeholder
  while (select.options.length > 1) {
    select.remove(1);
  }

  if (history.length === 0) {
    select.style.display = 'none';
    return;
  }

  select.style.display = '';

  history.forEach((query) => {
    const option = document.createElement('option');
    option.value = query;

    // Truncate long queries for display
    if (query.length > MAX_DISPLAY_LENGTH) {
      option.textContent = query.substring(0, MAX_DISPLAY_LENGTH) + '...';
    } else {
      option.textContent = query;
    }

    select.appendChild(option);
  });
}

/**
 * Gets array of selected provider IDs
 */
export function getSelectedProviderIds(container: HTMLElement): string[] {
  const checkboxes = container.querySelectorAll<HTMLInputElement>(
    'input[type="checkbox"]:checked'
  );
  return Array.from(checkboxes).map((cb) => cb.value);
}

/**
 * Updates submit button disabled state
 */
export function updateSubmitButtonState(
  input: HTMLTextAreaElement,
  providersContainer: HTMLElement,
  button: HTMLButtonElement
): void {
  const hasQuery = input.value.trim().length > 0;
  const hasProviders = getSelectedProviderIds(providersContainer).length > 0;
  button.disabled = !hasQuery || !hasProviders;
}

/**
 * Handles form submission
 */
async function handleSubmit(
  query: string,
  providerIds: string[]
): Promise<void> {
  const message: QuerySubmitMessage = {
    type: 'SUBMIT_QUERY',
    payload: { query, providerIds },
  };

  try {
    const response = await chrome.runtime.sendMessage(message) as MessageResponse;

    if (response?.success) {
      await addQueryToHistory(query);
      window.close();
    } else {
      console.error('Submit failed:', response?.error);
    }
  } catch (error) {
    console.error('Failed to send message:', error);
  }
}

/**
 * Initializes the popup
 */
export async function initializePopup(doc: Document = document): Promise<void> {
  const queryInput = doc.getElementById('query-input') as HTMLTextAreaElement;
  const historySelect = doc.getElementById('history-select') as HTMLSelectElement;
  const providersContainer = doc.getElementById('providers-container') as HTMLElement;
  const submitBtn = doc.getElementById('submit-btn') as HTMLButtonElement;
  const settingsBtn = doc.getElementById('settings-btn') as HTMLButtonElement;

  // Settings button opens options page
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  // Load data from storage
  const data = await getStorageData();

  // Render UI - only show enabled providers in popup
  const enabledProviders = data.providers.filter(p => p.enabled);
  renderProviderCheckboxes(enabledProviders, providersContainer);
  renderQueryHistory(data.queryHistory, historySelect);

  // Set up event listeners
  queryInput.addEventListener('input', () => {
    updateSubmitButtonState(queryInput, providersContainer, submitBtn);
  });

  providersContainer.addEventListener('change', () => {
    updateSubmitButtonState(queryInput, providersContainer, submitBtn);
  });

  historySelect.addEventListener('change', () => {
    if (historySelect.value) {
      queryInput.value = historySelect.value;
      historySelect.value = ''; // Reset selection
      updateSubmitButtonState(queryInput, providersContainer, submitBtn);
      queryInput.focus();
    }
  });

  submitBtn.addEventListener('click', async () => {
    const query = queryInput.value.trim();
    const providerIds = getSelectedProviderIds(providersContainer);

    if (query && providerIds.length > 0) {
      await handleSubmit(query, providerIds);
    }
  });

  // Keyboard shortcut: Ctrl/Cmd+Enter to submit
  queryInput.addEventListener('keydown', async (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      const query = queryInput.value.trim();
      const providerIds = getSelectedProviderIds(providersContainer);

      if (query && providerIds.length > 0) {
        await handleSubmit(query, providerIds);
      }
    }
  });

  // Initial button state
  updateSubmitButtonState(queryInput, providersContainer, submitBtn);
}

// Auto-initialize only when running in actual popup context.
// Detection: check for popup-specific elements that only exist in popup.html
function shouldAutoInitialize(): boolean {
  if (typeof document === 'undefined') return false;

  // All required popup elements must exist for auto-init
  const requiredElements = [
    'query-input',
    'history-select',
    'providers-container',
    'submit-btn'
  ];

  return requiredElements.every(id => document.getElementById(id) !== null);
}

if (shouldAutoInitialize()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializePopup());
  } else {
    initializePopup();
  }
}
