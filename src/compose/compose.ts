import type { Provider, QuerySubmitMessage, MessageResponse } from '../shared/types';
import { getStorageData, addQueryToHistory } from '../shared/storage';

const SELECTED_TEXT_STORAGE_KEY = 'contextMenuSelectedText';

/**
 * Renders provider checkboxes in the container
 */
function renderProviderCheckboxes(
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
 * Gets array of selected provider IDs
 */
function getSelectedProviderIds(container: HTMLElement): string[] {
  const checkboxes = container.querySelectorAll<HTMLInputElement>(
    'input[type="checkbox"]:checked'
  );
  return Array.from(checkboxes).map((cb) => cb.value);
}

/**
 * Updates submit button disabled state
 */
function updateSubmitButtonState(
  selectedText: string,
  providersContainer: HTMLElement,
  button: HTMLButtonElement
): void {
  // We need at least selected text and at least one provider
  const hasText = selectedText.trim().length > 0;
  const hasProviders = getSelectedProviderIds(providersContainer).length > 0;
  button.disabled = !hasText || !hasProviders;
}

/**
 * Builds the final query from prompt and selected text
 */
function buildFinalQuery(prompt: string, selectedText: string): string {
  const trimmedPrompt = prompt.trim();
  const trimmedText = selectedText.trim();

  if (trimmedPrompt) {
    return `${trimmedPrompt}\n\n${trimmedText}`;
  }
  return trimmedText;
}

/**
 * Updates the query preview with formatted content
 */
function updateQueryPreview(
  prompt: string,
  selectedText: string,
  previewElement: HTMLElement
): void {
  const trimmedPrompt = prompt.trim();
  const trimmedText = selectedText.trim();

  if (trimmedPrompt) {
    previewElement.innerHTML = `<span class="prompt-part">${escapeHtml(trimmedPrompt)}</span><span class="separator">---</span>${escapeHtml(trimmedText)}`;
  } else {
    previewElement.textContent = trimmedText;
  }
}

/**
 * Escapes HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
      // Clear the stored selected text
      await chrome.storage.local.remove(SELECTED_TEXT_STORAGE_KEY);
      window.close();
    } else {
      console.error('Submit failed:', response?.error);
    }
  } catch (error) {
    console.error('Failed to send message:', error);
  }
}

/**
 * Initializes the compose page
 */
async function initializeCompose(): Promise<void> {
  const selectedTextInput = document.getElementById('selected-text') as HTMLTextAreaElement;
  const promptInput = document.getElementById('prompt-input') as HTMLTextAreaElement;
  const queryPreview = document.getElementById('query-preview') as HTMLElement;
  const providersContainer = document.getElementById('providers-container') as HTMLElement;
  const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
  const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;

  // Get the selected text from storage
  const result = await chrome.storage.local.get(SELECTED_TEXT_STORAGE_KEY);
  const initialSelectedText = result[SELECTED_TEXT_STORAGE_KEY] || '';

  // Set the selected text in the textarea (editable)
  selectedTextInput.value = initialSelectedText;

  // Load providers from storage
  const data = await getStorageData();
  const enabledProviders = data.providers.filter(p => p.enabled);
  renderProviderCheckboxes(enabledProviders, providersContainer);

  // Helper to get current selected text value
  const getSelectedText = () => selectedTextInput.value;

  // Initial preview and button state
  updateQueryPreview(promptInput.value, getSelectedText(), queryPreview);
  updateSubmitButtonState(getSelectedText(), providersContainer, submitBtn);

  // Update preview and button state when selected text changes
  selectedTextInput.addEventListener('input', () => {
    updateQueryPreview(promptInput.value, getSelectedText(), queryPreview);
    updateSubmitButtonState(getSelectedText(), providersContainer, submitBtn);
  });

  // Update preview when prompt changes
  promptInput.addEventListener('input', () => {
    updateQueryPreview(promptInput.value, getSelectedText(), queryPreview);
  });

  // Update button state when provider selection changes
  providersContainer.addEventListener('change', () => {
    updateSubmitButtonState(getSelectedText(), providersContainer, submitBtn);
  });

  // Handle submit
  submitBtn.addEventListener('click', async () => {
    const providerIds = getSelectedProviderIds(providersContainer);
    const finalQuery = buildFinalQuery(promptInput.value, getSelectedText());

    if (finalQuery && providerIds.length > 0) {
      await handleSubmit(finalQuery, providerIds);
    }
  });

  // Handle cancel
  cancelBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove(SELECTED_TEXT_STORAGE_KEY);
    window.close();
  });

  // Keyboard shortcut: Ctrl/Cmd+Enter to submit from either textarea
  const handleKeyboardSubmit = async (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      const providerIds = getSelectedProviderIds(providersContainer);
      const finalQuery = buildFinalQuery(promptInput.value, getSelectedText());

      if (finalQuery && providerIds.length > 0) {
        await handleSubmit(finalQuery, providerIds);
      }
    }
  };

  selectedTextInput.addEventListener('keydown', handleKeyboardSubmit);
  promptInput.addEventListener('keydown', handleKeyboardSubmit);

  // Escape key to cancel
  document.addEventListener('keydown', async (e) => {
    if (e.key === 'Escape') {
      await chrome.storage.local.remove(SELECTED_TEXT_STORAGE_KEY);
      window.close();
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initializeCompose());
} else {
  initializeCompose();
}
