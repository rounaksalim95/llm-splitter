# Privacy Policy for LLM Splitter

**Last updated:** February 2026

## Overview

LLM Splitter is a Chrome extension that lets you send queries to multiple LLM providers simultaneously. This privacy policy explains how the extension handles your data.

## No Data Collection

LLM Splitter does **not** collect, transmit, or store any personal data on external servers. The extension has no backend server and makes no network requests beyond what is required to interact with the LLM provider pages you already use.

## Local Storage Only

User preferences (such as selected providers and window layout settings), query history, and provider configuration are stored locally on your device using `chrome.storage.local`. This data never leaves your browser.

You can clear all stored data at any time through the extension's options page or by uninstalling the extension.

## Host Permissions

The extension requests access to the following sites:

- `https://chatgpt.com/*`
- `https://claude.ai/*`
- `https://gemini.google.com/*`
- `https://grok.com/*`

These permissions are used solely to inject your queries into the input fields on those pages and to arrange browser windows side by side. The extension does **not** read, collect, or exfiltrate any data from these sites.

## No Analytics or Tracking

LLM Splitter contains no third-party analytics, telemetry, or tracking code. No usage data is collected or shared with anyone.

## Changes to This Policy

If this privacy policy is updated, the changes will be reflected in this document with an updated date.

## Contact

If you have questions about this privacy policy, please open an issue on the project's GitHub repository.
