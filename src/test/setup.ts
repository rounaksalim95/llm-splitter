import { beforeEach } from 'vitest';
import { mockChrome, resetChromeMocks } from './mocks/chrome';

// Inject chrome mock into global scope
(globalThis as unknown as { chrome: typeof mockChrome }).chrome = mockChrome;

// Reset mocks before each test
beforeEach(() => {
  resetChromeMocks();
});
