# LLM Splitter - Chrome Extension Specification

## Overview
LLM Splitter is a Chrome extension that allows users to input a single query and simultaneously open it across multiple LLM chat providers (ChatGPT, Claude, Gemini, Grok, etc.), with windows arranged side-by-side on the current monitor.

## Core Features (V1)

### 1. Query Input
- **Toolbar Popup**: Click extension icon to open popup with query input field
- **Keyboard Shortcut**: Configurable hotkey (default: `Ctrl+Shift+Q` on all platforms)
- **Query History**: Store recent queries with ability to select/modify previous queries

### 2. Provider Management
- **Default Providers**: ChatGPT, Claude, Gemini, Grok
- **Configurable List**: Users can enable/disable providers in settings
- **Extensible Architecture**: Easy to add new providers via configuration
- **Quick Toggle**: Checkboxes in popup to select providers for current query
- **Per-Provider Settings**:
  - New chat URL (with sensible defaults)
  - Display name
  - Enabled/disabled state

### 3. Window Management
- **Auto-Arrange**: Windows arranged side-by-side with equal width
- **Current Monitor**: Use the monitor where browser is active
- **Dynamic Layout**: Adjust based on number of selected providers
  - 2 providers: 50/50 split
  - 3 providers: 33/33/33 split
  - 4 providers: 25/25/25/25 or 2x2 grid

### 4. Query Execution
- **Auto-Submit**: Automatically paste query and submit to each provider
- **Content Scripts**: Inject scripts to interact with each provider's chat interface
- **Open Regardless of Auth**: Open all windows even if user isn't logged in

## Technical Architecture

### Tech Stack
- **TypeScript** for type safety
- **Vite** for building/bundling
- **Chrome Extension Manifest V3**

### Extension Components

```
llm-splitter/
├── src/
│   ├── background/
│   │   └── service-worker.ts    # Background script for window management
│   ├── popup/
│   │   ├── popup.html           # Popup UI
│   │   ├── popup.ts             # Popup logic
│   │   └── popup.css            # Popup styles
│   ├── options/
│   │   ├── options.html         # Settings page (full-page, opens in tab)
│   │   ├── options.ts           # Settings logic (drag-drop, toggles, history)
│   │   └── options.css          # Settings styles (CSS vars, dark mode)
│   ├── content-scripts/
│   │   ├── injector.ts          # Generic content script loader
│   │   └── providers/
│   │       ├── chatgpt.ts       # ChatGPT-specific injection
│   │       ├── claude.ts        # Claude-specific injection
│   │       ├── gemini.ts        # Gemini-specific injection
│   │       └── grok.ts          # Grok-specific injection
│   ├── shared/
│   │   ├── types.ts             # TypeScript interfaces
│   │   ├── storage.ts           # Chrome storage utilities
│   │   └── providers.ts         # Provider configurations
│   └── manifest.json            # Extension manifest
├── vite.config.ts
├── tsconfig.json
├── package.json
└── SPEC.md
```

### Provider Configuration Schema

```typescript
interface Provider {
  id: string;
  name: string;
  newChatUrl: string;
  inputSelector: string;       // CSS selector for text input
  submitSelector: string;      // CSS selector for submit button
  enabled: boolean;
  urlPattern: string;          // For content script matching
}
```

### Default Provider Configurations

| Provider | New Chat URL | Notes |
|----------|-------------|-------|
| ChatGPT  | `https://chat.openai.com/` | Uses textarea + send button |
| Claude   | `https://claude.ai/new` | Uses contenteditable div |
| Gemini   | `https://gemini.google.com/app` | Uses textarea |
| Grok     | `https://grok.com/` | Uses textarea |

### Storage Schema

```typescript
interface StorageData {
  providers: Provider[];
  queryHistory: string[];       // Last N queries (max 20)
  settings: {
    maxHistoryItems: number;
    keyboardShortcut: string;
    defaultLayout: 'horizontal' | 'grid';
  };
}
```

## User Flows

### Primary Flow: Send Query
1. User clicks extension icon or presses keyboard shortcut
2. Popup opens with query input and provider checkboxes
3. User types query (or selects from history)
4. User adjusts provider selection if needed
5. User presses Enter or clicks "Send"
6. Extension:
   - Calculates window positions based on provider count and screen size
   - Opens new windows for each selected provider at calculated positions
   - Injects content script into each window
   - Content script waits for page load, then:
     - Finds input field
     - Enters query text
     - Clicks submit button

### Settings Flow
1. User right-clicks extension icon → "Options" (or clicks gear in popup)
2. Settings page shows:
   - Provider list with enable/disable toggles and drag-to-reorder
   - Query history list with "Clear History" button
   - Current keyboard shortcut with link to Chrome's shortcuts page

## Chrome APIs Used
- `chrome.windows.create()` - Create positioned windows
- `chrome.tabs.create()` - Create tabs in windows
- `chrome.storage.sync` - Persist settings across devices
- `chrome.storage.local` - Store query history locally
- `chrome.scripting.executeScript()` - Inject content scripts
- `chrome.commands` - Keyboard shortcuts

## Future Enhancements (Post-V1)
- Add/edit/delete custom providers via options page
- Model/mode selection per provider (e.g., GPT-4, Claude Opus, thinking mode)
- Response comparison view (aggregate responses in single window)
- Query templates/presets
- Sync query history across devices
- Browser action context menu for selected text

## Development Phases

### Phase 1: Query Input (Complete)
- Popup UI with query textarea, provider checkboxes, history dropdown
- Query history with deduplication and persistence
- Keyboard shortcut (Ctrl+Shift+Q) to open popup
- Service worker receives SUBMIT_QUERY messages

### Phase 2: Window Management + Query Execution (Complete)
- Window management: Opens provider windows arranged side-by-side
- Dynamic layout based on provider count (50/50, 33/33/33, 25/25/25/25, or 2x2 grid)
- Content script injection for query auto-fill
- Provider-specific text entry handling:
  - Standard textarea/input (ChatGPT, Grok)
  - ContentEditable div (Claude)
  - Quill editor (Gemini)
- Auto-submit after query injection

### Phase 3: Options Page (Complete)
- Full-page options UI with system theme support (light/dark via `prefers-color-scheme`)
- Provider management: toggle enable/disable and drag-and-drop reorder
- Query history viewing and clear all functionality
- Keyboard shortcut display with link to Chrome's extension shortcuts page
- Settings button in popup opens options page

## TODO
- [ ] **Customizable Keyboard Shortcut**: Add UI in settings page to allow users to configure the keyboard shortcut (currently hardcoded to `Ctrl+Shift+Q`). Note: `Cmd+Shift+Q` conflicts with macOS system shortcut for quitting applications. Currently, users can change shortcuts via Chrome's built-in `chrome://extensions/shortcuts` page.
- [x] **Options Page**: Implement settings UI for provider management (toggle, reorder, query history, theme support)

## Verification Plan
1. **Manual Testing**:
   - Install unpacked extension in Chrome
   - Test popup opens via icon click and keyboard shortcut
   - Test query submission to all 4 default providers
   - Verify window positioning on single and multi-monitor setups
   - Test provider toggle in popup
   - Test settings page and persistence
   - Test options page: provider toggle/reorder, clear history, theme switching
2. **Edge Cases**:
   - Provider not logged in (should still open)
   - Very long queries
   - Special characters in queries
   - Rapid successive queries
   - Empty query history (shows "No queries yet")
   - All providers disabled (shows warning)
