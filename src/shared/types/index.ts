/**
 * Supported LLM provider identifiers
 */
export type ProviderId = 'chatgpt' | 'claude' | 'gemini' | 'grok';

/**
 * Configuration for an LLM provider
 */
export interface ProviderConfig {
  id: ProviderId;
  name: string;
  url: string;
  enabled: boolean;
  color: string;
}

/**
 * User settings stored in chrome.storage
 */
export interface UserSettings {
  providers: ProviderConfig[];
  windowLayout: WindowLayout;
  defaultQuery: string;
  theme: 'light' | 'dark' | 'system';
}

/**
 * Window layout configuration
 */
export interface WindowLayout {
  arrangement: 'horizontal' | 'vertical' | 'grid';
  windowWidth: number;
  windowHeight: number;
}

/**
 * Message types for communication between extension components
 */
export type MessageType =
  | 'SUBMIT_QUERY'
  | 'QUERY_SUBMITTED'
  | 'QUERY_FAILED'
  | 'GET_SETTINGS'
  | 'SETTINGS_UPDATED'
  | 'PROVIDER_READY'
  | 'PING';

/**
 * Base message interface for extension communication
 */
export interface ExtensionMessage<T = unknown> {
  type: MessageType;
  payload?: T;
  timestamp: number;
}

/**
 * Message to submit a query to a provider
 */
export interface SubmitQueryMessage extends ExtensionMessage<{ query: string }> {
  type: 'SUBMIT_QUERY';
}

/**
 * Message indicating query was successfully submitted
 */
export interface QuerySubmittedMessage extends ExtensionMessage<{ providerId: ProviderId }> {
  type: 'QUERY_SUBMITTED';
}

/**
 * Message indicating query submission failed
 */
export interface QueryFailedMessage extends ExtensionMessage<{ providerId: ProviderId; error: string }> {
  type: 'QUERY_FAILED';
}

/**
 * Result of attempting to find an input element on a provider page
 */
export interface InputDetectionResult {
  found: boolean;
  element?: HTMLElement;
  type: 'textarea' | 'contenteditable' | 'input' | 'unknown';
}

/**
 * Result of attempting to find a submit button on a provider page
 */
export interface SubmitButtonDetectionResult {
  found: boolean;
  element?: HTMLElement;
  type: 'button' | 'icon' | 'keyboard' | 'unknown';
}
