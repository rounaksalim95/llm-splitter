import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'LLM Splitter',
  version: '0.1.0',
  description: 'Split your LLM queries across multiple providers simultaneously',
  permissions: ['storage', 'activeTab', 'scripting'],
  host_permissions: [
    'https://chat.openai.com/*',
    'https://chatgpt.com/*',
    'https://claude.ai/*',
    'https://gemini.google.com/*',
    'https://grok.x.ai/*',
    'https://x.com/i/grok*',
  ],
  action: {
    default_popup: 'src/popup/popup.html',
    default_icon: {
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
    default_title: 'LLM Splitter',
  },
  icons: {
    '16': 'icons/icon-16.png',
    '32': 'icons/icon-32.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['https://chat.openai.com/*', 'https://chatgpt.com/*'],
      js: ['src/content/providers/chatgpt.ts'],
      run_at: 'document_idle',
    },
    {
      matches: ['https://claude.ai/*'],
      js: ['src/content/providers/claude.ts'],
      run_at: 'document_idle',
    },
    {
      matches: ['https://gemini.google.com/*'],
      js: ['src/content/providers/gemini.ts'],
      run_at: 'document_idle',
    },
    {
      matches: ['https://grok.x.ai/*', 'https://x.com/i/grok*'],
      js: ['src/content/providers/grok.ts'],
      run_at: 'document_idle',
    },
  ],
  options_ui: {
    page: 'src/options/options.html',
    open_in_tab: true,
  },
  web_accessible_resources: [
    {
      resources: ['icons/*'],
      matches: ['<all_urls>'],
    },
  ],
});
