// tests/poe-clipboard/index.test.ts
import { describe, it, expect } from 'vitest';
import * as parser from '../../src/lib/poe-clipboard/index.js';

describe('clipboard parser public API', () => {
  it('exports the documented symbols', () => {
    expect(typeof parser.parse).toBe('function');
    expect(typeof parser.tokenize).toBe('function');
  });
});
