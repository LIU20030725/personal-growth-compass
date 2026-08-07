import { describe, expect, it } from 'vitest';
import { createMemoryEmotionMediaStore } from './emotionMediaStore';

describe('emotion media store contract', () => {
  it('支持写入、覆盖、读取和删除 Blob', async () => {
    const store = createMemoryEmotionMediaStore();
    await store.put('asset', new Blob(['first'], { type: 'text/plain' }));
    await store.put('asset', new Blob(['second'], { type: 'text/plain' }));
    expect((await store.get('asset'))?.size).toBe(6);
    await store.remove('asset');
    expect(await store.get('asset')).toBeNull();
  });

  it('批量删除不存在的附件也保持幂等', async () => {
    const store = createMemoryEmotionMediaStore();
    await store.put('one', new Blob(['1']));
    await store.removeMany(['one', 'missing']);
    expect(await store.get('one')).toBeNull();
  });
});
