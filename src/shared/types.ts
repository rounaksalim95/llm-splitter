/**
 * Represents an LLM provider configuration
 */
export interface Provider {
  /** Unique identifier for the provider */
  id: string;
  /** Display name of the provider */
  name: string;
  /** URL to open a new chat with this provider */
  newChatUrl: string;
  /** CSS selector for the input element */
  inputSelector: string;
  /** CSS selector for the submit button */
  submitSelector: string;
  /** Whether this provider is enabled */
  enabled: boolean;
  /** URL pattern to match for this provider */
  urlPattern: string;
}

/**
 * User settings for the extension
 */
export interface Settings {
  /** Maximum number of queries to store in history */
  maxHistoryItems: number;
  /** Keyboard shortcut to open the popup */
  keyboardShortcut: string;
  /** Default layout for provider windows */
  defaultLayout: 'grid' | 'horizontal' | 'vertical';
}

/**
 * All data stored in Chrome storage
 */
export interface StorageData {
  /** List of configured providers */
  providers: Provider[];
  /** History of submitted queries */
  queryHistory: string[];
  /** User settings */
  settings: Settings;
}

/**
 * Message sent when submitting a query
 */
export interface QuerySubmitMessage {
  type: 'SUBMIT_QUERY';
  payload: {
    query: string;
    providerIds: string[];
  };
}

/**
 * Message sent from service worker to content script to inject a query
 */
export interface InjectQueryMessage {
  type: 'INJECT_QUERY';
  payload: {
    query: string;
    inputSelector: string;
    submitSelector: string;
  };
}

/**
 * Message sent to check if content script is ready
 */
export interface PingMessage {
  type: 'PING';
}

/**
 * Response to PING message confirming content script is ready
 */
export interface PongMessage {
  type: 'PONG';
}

/**
 * Window position configuration
 */
export interface WindowPosition {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Generic message type for extension communication
 */
export type ExtensionMessage = QuerySubmitMessage | InjectQueryMessage | PingMessage;

/**
 * Response from message handlers
 */
export interface MessageResponse {
  success: boolean;
  error?: string;
}
