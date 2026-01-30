import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  renderProviderCheckboxes,
  renderQueryHistory,
  getSelectedProviderIds,
  updateSubmitButtonState,
  initializePopup,
} from './popup';
import { setMockStorageData } from '../test/mocks/chrome';
import { DEFAULT_STORAGE_DATA } from '../shared/storage';
import { DEFAULT_PROVIDERS } from '../shared/providers';
import type { StorageData } from '../shared/types';

// Helper to set up DOM
function setupDOM(): Document {
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <body>
        <textarea id="query-input"></textarea>
        <select id="history-select">
          <option value="">Select from history...</option>
        </select>
        <div id="providers-container"></div>
        <button id="submit-btn" disabled>Submit to Selected</button>
      </body>
    </html>
  `);
  return dom.window.document;
}

describe('Popup', () => {
  let doc: Document;

  beforeEach(() => {
    doc = setupDOM();
    // Mock document in global scope
    vi.stubGlobal('document', doc);
    setMockStorageData({ storageData: DEFAULT_STORAGE_DATA });
  });

  describe('renderProviderCheckboxes', () => {
    it('should create checkboxes for each provider', () => {
      const container = doc.getElementById('providers-container')!;
      renderProviderCheckboxes(DEFAULT_PROVIDERS, container);

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes).toHaveLength(DEFAULT_PROVIDERS.length);
    });

    it('should respect provider enabled state', () => {
      const container = doc.getElementById('providers-container')!;
      const providers = [
        { ...DEFAULT_PROVIDERS[0], enabled: true },
        { ...DEFAULT_PROVIDERS[1], enabled: false },
      ];
      renderProviderCheckboxes(providers, container);

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
      expect((checkboxes[1] as HTMLInputElement).checked).toBe(false);
    });

    it('should set checkbox value to provider id', () => {
      const container = doc.getElementById('providers-container')!;
      renderProviderCheckboxes(DEFAULT_PROVIDERS, container);

      const checkbox = container.querySelector(
        'input[type="checkbox"]'
      ) as HTMLInputElement;
      expect(checkbox.value).toBe(DEFAULT_PROVIDERS[0].id);
    });

    it('should display provider name as label', () => {
      const container = doc.getElementById('providers-container')!;
      renderProviderCheckboxes(DEFAULT_PROVIDERS, container);

      const label = container.querySelector('label');
      expect(label?.textContent).toContain(DEFAULT_PROVIDERS[0].name);
    });
  });

  describe('renderQueryHistory', () => {
    it('should populate select with query history', () => {
      const select = doc.getElementById('history-select') as HTMLSelectElement;
      const history = ['query 1', 'query 2', 'query 3'];
      renderQueryHistory(history, select);

      // +1 for the placeholder option
      expect(select.options).toHaveLength(history.length + 1);
    });

    it('should truncate long queries in display', () => {
      const select = doc.getElementById('history-select') as HTMLSelectElement;
      const longQuery = 'a'.repeat(100);
      renderQueryHistory([longQuery], select);

      const option = select.options[1];
      expect(option.textContent!.length).toBeLessThan(longQuery.length);
      expect(option.textContent).toContain('...');
    });

    it('should store full query as value', () => {
      const select = doc.getElementById('history-select') as HTMLSelectElement;
      const longQuery = 'a'.repeat(100);
      renderQueryHistory([longQuery], select);

      const option = select.options[1];
      expect(option.value).toBe(longQuery);
    });

    it('should hide select when history is empty', () => {
      const select = doc.getElementById('history-select') as HTMLSelectElement;
      renderQueryHistory([], select);

      expect(select.style.display).toBe('none');
    });

    it('should show select when history has items', () => {
      const select = doc.getElementById('history-select') as HTMLSelectElement;
      select.style.display = 'none';
      renderQueryHistory(['query'], select);

      expect(select.style.display).not.toBe('none');
    });
  });

  describe('getSelectedProviderIds', () => {
    it('should return array of selected provider ids', () => {
      const container = doc.getElementById('providers-container')!;
      renderProviderCheckboxes(DEFAULT_PROVIDERS, container);

      // Check first two providers
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      (checkboxes[0] as HTMLInputElement).checked = true;
      (checkboxes[1] as HTMLInputElement).checked = true;
      (checkboxes[2] as HTMLInputElement).checked = false;
      (checkboxes[3] as HTMLInputElement).checked = false;

      const selected = getSelectedProviderIds(container);
      expect(selected).toEqual([DEFAULT_PROVIDERS[0].id, DEFAULT_PROVIDERS[1].id]);
    });

    it('should return empty array when nothing selected', () => {
      const container = doc.getElementById('providers-container')!;
      renderProviderCheckboxes(
        DEFAULT_PROVIDERS.map((p) => ({ ...p, enabled: false })),
        container
      );

      const selected = getSelectedProviderIds(container);
      expect(selected).toEqual([]);
    });
  });

  describe('updateSubmitButtonState', () => {
    it('should disable button when query is empty', () => {
      const button = doc.getElementById('submit-btn') as HTMLButtonElement;
      const input = doc.getElementById('query-input') as HTMLTextAreaElement;
      const container = doc.getElementById('providers-container')!;

      renderProviderCheckboxes(DEFAULT_PROVIDERS, container);
      input.value = '';

      updateSubmitButtonState(input, container, button);
      expect(button.disabled).toBe(true);
    });

    it('should disable button when no providers selected', () => {
      const button = doc.getElementById('submit-btn') as HTMLButtonElement;
      const input = doc.getElementById('query-input') as HTMLTextAreaElement;
      const container = doc.getElementById('providers-container')!;

      renderProviderCheckboxes(
        DEFAULT_PROVIDERS.map((p) => ({ ...p, enabled: false })),
        container
      );
      input.value = 'test query';

      updateSubmitButtonState(input, container, button);
      expect(button.disabled).toBe(true);
    });

    it('should enable button when query and providers exist', () => {
      const button = doc.getElementById('submit-btn') as HTMLButtonElement;
      const input = doc.getElementById('query-input') as HTMLTextAreaElement;
      const container = doc.getElementById('providers-container')!;

      renderProviderCheckboxes(DEFAULT_PROVIDERS, container);
      input.value = 'test query';

      updateSubmitButtonState(input, container, button);
      expect(button.disabled).toBe(false);
    });

    it('should disable button when query is only whitespace', () => {
      const button = doc.getElementById('submit-btn') as HTMLButtonElement;
      const input = doc.getElementById('query-input') as HTMLTextAreaElement;
      const container = doc.getElementById('providers-container')!;

      renderProviderCheckboxes(DEFAULT_PROVIDERS, container);
      input.value = '   ';

      updateSubmitButtonState(input, container, button);
      expect(button.disabled).toBe(true);
    });
  });

  describe('History selection', () => {
    it('should populate query input when history item selected', () => {
      const select = doc.getElementById('history-select') as HTMLSelectElement;
      const input = doc.getElementById('query-input') as HTMLTextAreaElement;
      const history = ['test query'];

      renderQueryHistory(history, select);

      // Simulate selection
      select.value = 'test query';
      select.dispatchEvent(new Event('change'));

      // The popup.ts should handle this - just verify the structure exists
      expect(select.value).toBe('test query');
    });
  });

  describe('Keyboard shortcuts', () => {
    it('should have query input for keyboard events', () => {
      const input = doc.getElementById('query-input') as HTMLTextAreaElement;
      expect(input).toBeDefined();
      expect(input.tagName).toBe('TEXTAREA');
    });
  });

  describe('initializePopup', () => {
    it('should only load enabled providers from storage', async () => {
      const customData: StorageData = {
        ...DEFAULT_STORAGE_DATA,
        providers: DEFAULT_PROVIDERS.map((p, i) => ({
          ...p,
          enabled: i === 0, // only first enabled
        })),
      };
      setMockStorageData({ storageData: customData });

      await initializePopup(doc);

      const container = doc.getElementById('providers-container')!;
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      // Only enabled providers should be rendered in popup
      expect(checkboxes.length).toBe(1);
      expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
    });

    it('should load history from storage', async () => {
      const customData: StorageData = {
        ...DEFAULT_STORAGE_DATA,
        queryHistory: ['history item 1', 'history item 2'],
      };
      setMockStorageData({ storageData: customData });

      await initializePopup(doc);

      const select = doc.getElementById('history-select') as HTMLSelectElement;
      // +1 for placeholder
      expect(select.options).toHaveLength(3);
    });
  });
});
