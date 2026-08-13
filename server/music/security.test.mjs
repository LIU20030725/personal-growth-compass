import { describe, expect, it, vi } from 'vitest';
import { fetchWithTimeout } from './security.mjs';

describe('bounded upstream requests', () => {
  it('aborts a slow platform request at the configured timeout', async () => {
    const fetcher = vi.fn((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }));
    await expect(fetchWithTimeout(fetcher, 'https://music.163.com/fixed', {}, 5)).rejects.toMatchObject({ code: 'UPSTREAM_TIMEOUT' });
  });
});
