import { describe, expect, it, vi } from 'vitest';
import { fetchWithTimeout, isPublicAddress } from './security.mjs';

describe('bounded upstream requests', () => {
  it('aborts a slow platform request at the configured timeout', async () => {
    const fetcher = vi.fn((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }));
    await expect(fetchWithTimeout(fetcher, 'https://music.163.com/fixed', {}, 5)).rejects.toMatchObject({ code: 'UPSTREAM_TIMEOUT' });
  });

  it('rejects non-JSON upstream MIME', async () => {
    const { readBoundedJson } = await import('./security.mjs');
    await expect(readBoundedJson(new Response('<html>blocked</html>', { status: 200, headers: { 'content-type': 'text/html' } })))
      .rejects.toMatchObject({ code: 'UPSTREAM_UNAVAILABLE' });
  });

  it('applies the total timeout while the response body is streaming', async () => {
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('{')); setTimeout(() => controller.enqueue(new TextEncoder().encode('}')), 50); } });
    const response = new Response(stream, { status: 200, headers: { 'content-type': 'application/json' } });
    const { readBoundedJson } = await import('./security.mjs');
    await expect(readBoundedJson(response, 512 * 1024, { timeoutMs: 5 })).rejects.toMatchObject({ code: 'UPSTREAM_TIMEOUT' });
  });
});

describe('resolved address validation', () => {
  it.each([
    '127.0.0.1', '0.0.0.0', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.169.254',
    '100.64.0.1', '::1', '::', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1'
  ])('rejects private, loopback, metadata and mapped addresses: %s', (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });
  it.each(['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111'])('accepts public addresses: %s', (address) => {
    expect(isPublicAddress(address)).toBe(true);
  });
});
