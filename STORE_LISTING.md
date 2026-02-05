# Chrome Web Store Listing — LLM Splitter

Reference document with ready-to-paste content for the Chrome Web Store submission form.

---

## Short Description (132 characters max)

```
Send one query to ChatGPT, Claude, Gemini, and Grok at once. Compare answers side by side with automatic window layout.
```

## Detailed Description

```
LLM Splitter lets you query multiple LLM providers simultaneously and compare their responses side by side.

Key features:

• Multi-provider querying — Send a single prompt to ChatGPT, Claude, Gemini, and Grok in one action.

• Side-by-side window layout — Browser windows are automatically arranged so you can compare responses at a glance.

• Keyboard shortcut — Press Ctrl+Shift+L (customizable) to open the query popup from any tab.

• Right-click context menu — Select text on any page and send it to your chosen providers via the context menu.

• Query history — Previously sent queries are saved locally so you can revisit or resend them.

• Compose window — Edit selected text before sending, so you can refine your prompt without leaving the page.

• Privacy-first — All data stays on your device. No accounts, no analytics, no tracking.
```

## Category

```
Productivity
```

## Permission Justifications

| Permission | Justification |
|---|---|
| `storage` | Stores user preferences, selected providers, and query history locally on the device. |
| `activeTab` | Accesses the currently active tab to inject the query popup UI. |
| `tabs` | Opens and arranges LLM provider tabs/windows in a side-by-side layout. |
| `system.display` | Reads display dimensions to calculate optimal side-by-side window positions. |
| `contextMenus` | Adds a right-click context menu item to send selected text to LLM providers. |

### Host Permission Justifications

| Host Permission | Justification |
|---|---|
| `https://chatgpt.com/*` | Injects queries into the ChatGPT input field and submits them on behalf of the user. |
| `https://claude.ai/*` | Injects queries into the Claude input field and submits them on behalf of the user. |
| `https://gemini.google.com/*` | Injects queries into the Gemini input field and submits them on behalf of the user. |
| `https://grok.com/*` | Injects queries into the Grok input field and submits them on behalf of the user. |
