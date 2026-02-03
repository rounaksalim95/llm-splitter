import { beforeEach } from 'vitest';
import { mockChrome, resetChromeMocks } from './mocks/chrome';

// Inject chrome mock into global scope IMMEDIATELY (before any module imports)
// This is critical because service-worker.ts has top-level initialization code
(globalThis as unknown as { chrome: typeof mockChrome }).chrome = mockChrome;

// Reset mocks before each test
beforeEach(() => {
  resetChromeMocks();
});
