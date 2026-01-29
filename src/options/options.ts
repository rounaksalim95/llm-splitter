import type { Provider } from '../shared/types';
import {
  getStorageData,
  clearQueryHistory,
  updateProviderOrder,
  toggleProvider,
} from '../shared/storage';

const MAX_DISPLAY_LENGTH = 100;

let draggedElement: HTMLElement | null = null;

/**
 * Creates a provider list item element
 */
function createProviderItem(provider: Provider): HTMLElement {
  const item = document.createElement('div');
  item.className = 'provider-item';
  item.dataset.providerId = provider.id;
  item.draggable = true;

  const handle = document.createElement('span');
  handle.className = 'drag-handle';
  handle.textContent = '\u2237'; // ⋮⋮ equivalent

  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.className = 'provider-toggle';
  toggle.id = `toggle-${provider.id}`;
  toggle.checked = provider.enabled;

  const name = document.createElement('label');
  name.className = 'provider-name';
  name.htmlFor = `toggle-${provider.id}`;
  name.textContent = provider.name;

  item.appendChild(handle);
  item.appendChild(toggle);
  item.appendChild(name);

  return item;
}

/**
 * Renders the providers list with drag-and-drop support
 */
function renderProviders(providers: Provider[], container: HTMLElement): void {
  container.innerHTML = '';

  providers.forEach((provider) => {
    const item = createProviderItem(provider);
    container.appendChild(item);
  });
}

/**
 * Gets the current order of provider IDs from the DOM
 */
function getProviderOrder(container: HTMLElement): string[] {
  const items = container.querySelectorAll<HTMLElement>('.provider-item');
  return Array.from(items).map((item) => item.dataset.providerId!);
}

/**
 * Checks if at least one provider is enabled and shows/hides warning
 */
function updateProviderWarning(container: HTMLElement): void {
  const checkboxes = container.querySelectorAll<HTMLInputElement>('.provider-toggle');
  const anyEnabled = Array.from(checkboxes).some((cb) => cb.checked);
  const warning = document.getElementById('providers-warning');
  if (warning) {
    warning.hidden = anyEnabled;
  }
}

/**
 * Sets up drag-and-drop event handlers
 */
function setupDragAndDrop(container: HTMLElement): void {
  container.addEventListener('dragstart', (e) => {
    const target = (e.target as HTMLElement).closest('.provider-item') as HTMLElement;
    if (!target) return;

    draggedElement = target;
    target.classList.add('dragging');

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', target.dataset.providerId || '');
    }
  });

  container.addEventListener('dragend', (e) => {
    const target = (e.target as HTMLElement).closest('.provider-item') as HTMLElement;
    if (target) {
      target.classList.remove('dragging');
    }
    draggedElement = null;

    // Remove any lingering drag-over classes
    container.querySelectorAll('.drag-over').forEach((el) => {
      el.classList.remove('drag-over');
    });
  });

  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }

    const target = (e.target as HTMLElement).closest('.provider-item') as HTMLElement;
    if (!target || target === draggedElement) return;

    // Remove drag-over from all items
    container.querySelectorAll('.drag-over').forEach((el) => {
      el.classList.remove('drag-over');
    });

    target.classList.add('drag-over');
  });

  container.addEventListener('dragleave', (e) => {
    const target = (e.target as HTMLElement).closest('.provider-item') as HTMLElement;
    if (target) {
      target.classList.remove('drag-over');
    }
  });

  container.addEventListener('drop', async (e) => {
    e.preventDefault();

    const target = (e.target as HTMLElement).closest('.provider-item') as HTMLElement;
    if (!target || !draggedElement || target === draggedElement) return;

    target.classList.remove('drag-over');

    // Determine insertion position
    const items = Array.from(container.querySelectorAll('.provider-item'));
    const draggedIndex = items.indexOf(draggedElement);
    const targetIndex = items.indexOf(target);

    if (draggedIndex < targetIndex) {
      target.after(draggedElement);
    } else {
      target.before(draggedElement);
    }

    // Persist new order
    const newOrder = getProviderOrder(container);
    await updateProviderOrder(newOrder);
  });
}

/**
 * Sets up toggle change handlers
 */
function setupToggleHandlers(container: HTMLElement): void {
  container.addEventListener('change', async (e) => {
    const target = e.target as HTMLInputElement;
    if (!target.classList.contains('provider-toggle')) return;

    const item = target.closest('.provider-item') as HTMLElement;
    const providerId = item?.dataset.providerId;

    if (providerId) {
      await toggleProvider(providerId, target.checked);
      updateProviderWarning(container);
    }
  });
}

/**
 * Renders query history list
 */
function renderHistory(history: string[], container: HTMLElement): void {
  const clearBtn = document.getElementById('clear-history-btn') as HTMLButtonElement;

  if (history.length === 0) {
    container.innerHTML = '<p class="empty-state">No queries yet</p>';
    if (clearBtn) clearBtn.disabled = true;
    return;
  }

  container.innerHTML = '';
  if (clearBtn) clearBtn.disabled = false;

  history.forEach((query) => {
    const item = document.createElement('div');
    item.className = 'history-item';

    // Truncate long queries
    if (query.length > MAX_DISPLAY_LENGTH) {
      item.textContent = query.substring(0, MAX_DISPLAY_LENGTH) + '...';
      item.title = query;
    } else {
      item.textContent = query;
    }

    container.appendChild(item);
  });
}

/**
 * Sets up the keyboard shortcut display and link
 */
function setupShortcutSection(): void {
  const link = document.getElementById('change-shortcut-link');
  if (link) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      // Open the Chrome extensions shortcuts page
      chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    });
  }
}

/**
 * Sets up clear history button
 */
function setupClearHistory(historyContainer: HTMLElement): void {
  const clearBtn = document.getElementById('clear-history-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      await clearQueryHistory();
      renderHistory([], historyContainer);
    });
  }
}

/**
 * Initializes the options page
 */
async function initializeOptions(): Promise<void> {
  const providersContainer = document.getElementById('providers-list') as HTMLElement;
  const historyContainer = document.getElementById('history-list') as HTMLElement;

  // Load data from storage
  const data = await getStorageData();

  // Render providers
  renderProviders(data.providers, providersContainer);
  setupDragAndDrop(providersContainer);
  setupToggleHandlers(providersContainer);
  updateProviderWarning(providersContainer);

  // Render history
  renderHistory(data.queryHistory, historyContainer);
  setupClearHistory(historyContainer);

  // Setup shortcut section
  setupShortcutSection();

  // Update keyboard shortcut display
  const shortcutValue = document.getElementById('shortcut-value');
  if (shortcutValue) {
    shortcutValue.textContent = data.settings.keyboardShortcut;
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initializeOptions());
} else {
  initializeOptions();
}
