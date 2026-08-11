import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { EmotionMediaStore } from './emotionMediaStore';
import type { EmotionStorage } from './emotionStorage';
import { useEmotionSystem } from './useEmotionSystem';

function setup(options: { failSave?: boolean; failRemove?: boolean } = {}) {
  const events: string[] = [];
  let saved = { schemaVersion: 2 as const, entries: [] as any[], importantDays: [] as any[] };
  const storage: EmotionStorage = {
    load: () => saved,
    save: (state) => {
      events.push('metadata:save');
      if (options.failSave) throw new Error('quota');
      saved = state;
    }
  };
  const media: EmotionMediaStore = {
    put: async (id) => { events.push(`blob:put:${id}`); },
    get: async () => null,
    remove: async () => {},
    removeMany: async (ids) => {
      events.push(`blob:remove:${ids.join(',')}`);
      if (options.failRemove) throw new Error('locked');
    }
  };
  const hook = renderHook(() => useEmotionSystem({
    storage,
    mediaStore: media,
    now: () => '2026-08-02T09:00:00.000Z',
    idFactory: (() => { let index = 0; return () => `id-${++index}`; })()
  }));
  return { ...hook, events, behavior: options };
}

describe('useEmotionSystem', () => {
  it('persists a music reference with the moment', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.createEntry({
        moodId: 'calm', activityIds: [], note: '', attachments: [],
        music: [{
          id: 'song-1', provider: 'qq', title: '一路向北', artist: '周杰伦',
          sourceUrl: 'https://y.qq.com/n/ryqq/songDetail/1', playbackUrl: '', isFavorite: true
        }]
      });
    });

    expect(result.current.entries[0].music).toEqual([expect.objectContaining({ id: 'song-1', provider: 'qq' })]);
    expect(result.current.libraryItems.map((item) => item.kind)).toContain('music');
  });

  it('creates an important day transactionally and exposes an upcoming reminder', async () => {
    const { result } = setup();
    let created = false;
    await act(async () => {
      created = result.current.createImportantDay({
        title: '出发旅行', dateKey: '2026-08-03', note: '带上相机', remindDaysBefore: 1, repeat: 'none'
      });
    });

    expect(created).toBe(true);
    expect(result.current.importantDays).toEqual([expect.objectContaining({ title: '出发旅行' })]);
    expect(result.current.upcomingImportantDays).toEqual([expect.objectContaining({ title: '出发旅行' })]);
  });

  it('先保存 Blob，再提交结构化记录', async () => {
    const { result, events } = setup();
    await act(async () => {
      await result.current.createEntry({ moodId: 'calm', activityIds: [], note: '安静片刻', attachments: [] }, [
        { blob: new Blob(['photo']), kind: 'image', fileName: 'photo.webp', mimeType: 'image/webp' }
      ]);
    });

    expect(events).toEqual(['blob:put:id-2', 'metadata:save']);
    expect(result.current.entries[0]).toMatchObject({ id: 'id-1', moodId: 'calm', note: '安静片刻' });
  });

  it('元数据保存失败时清理本次新增 Blob 并显示错误', async () => {
    const { result, events } = setup({ failSave: true });
    await act(async () => {
      await result.current.createEntry({ moodId: 'happy', activityIds: [], note: '', attachments: [] }, [
        { blob: new Blob(['photo']), kind: 'image', fileName: 'photo.webp', mimeType: 'image/webp' }
      ]);
    });

    expect(events).toEqual(['blob:put:id-2', 'metadata:save', 'blob:remove:id-2']);
    expect(result.current.entries).toHaveLength(0);
    expect(result.current.error).toContain('保存失败');
  });

  it('删除时元数据提交失败会保留原记录且不清理媒体', async () => {
    const behavior = { failSave: false };
    const { result, events } = setup(behavior);
    await act(async () => {
      await result.current.createEntry({ moodId: 'calm', activityIds: [], note: '', attachments: [] }, [
        { blob: new Blob(['old']), kind: 'image', fileName: 'old.webp', mimeType: 'image/webp' }
      ]);
    });
    behavior.failSave = true;
    const marker = events.length;
    let removed = true;
    await act(async () => { removed = await result.current.removeEntry('id-1'); });

    expect(removed).toBe(false);
    expect(result.current.entries).toHaveLength(1);
    expect(events.slice(marker)).toEqual(['metadata:save']);
    expect(result.current.error).toContain('删除失败');
  });

  it('媒体清理失败时保留已提交的删除结果并提示可重试', async () => {
    const behavior = { failRemove: false };
    const { result, events } = setup(behavior);
    await act(async () => {
      await result.current.createEntry({ moodId: 'calm', activityIds: [], note: '', attachments: [] }, [
        { blob: new Blob(['old']), kind: 'image', fileName: 'old.webp', mimeType: 'image/webp' }
      ]);
    });
    behavior.failRemove = true;
    const marker = events.length;
    let removed = false;
    await act(async () => { removed = await result.current.removeEntry('id-1'); });

    expect(removed).toBe(true);
    expect(result.current.entries).toHaveLength(0);
    expect(events.slice(marker)).toEqual(['metadata:save', 'blob:remove:id-2']);
    expect(result.current.error).toContain('媒体清理失败');
  });

  it('编辑已保存后，旧媒体清理失败不会回滚新记录', async () => {
    const behavior = { failRemove: false };
    const { result } = setup(behavior);
    await act(async () => {
      await result.current.createEntry({ moodId: 'calm', activityIds: [], note: '旧内容', attachments: [] }, [
        { blob: new Blob(['old']), kind: 'image', fileName: 'old.webp', mimeType: 'image/webp' }
      ]);
    });
    behavior.failRemove = true;
    let updated = false;
    await act(async () => {
      updated = await result.current.updateEntry('id-1', { moodId: 'happy', activityIds: [], note: '新内容', attachments: [] });
    });

    expect(updated).toBe(true);
    expect(result.current.entries[0]).toMatchObject({ moodId: 'happy', note: '新内容', attachments: [] });
    expect(result.current.error).toContain('旧媒体清理失败');
  });

  it('编辑移除附件后同时更新元数据并清理对应 Blob', async () => {
    const { result, events } = setup();
    await act(async () => {
      await result.current.createEntry({ moodId: 'calm', activityIds: [], note: '带图记录', attachments: [] }, [
        { blob: new Blob(['old']), kind: 'image', fileName: 'old.webp', mimeType: 'image/webp' }
      ]);
    });
    const marker = events.length;
    await act(async () => {
      await result.current.updateEntry('id-1', { moodId: 'calm', activityIds: [], note: '已移除图片', attachments: [] });
    });

    expect(result.current.entries[0].attachments).toEqual([]);
    expect(events.slice(marker)).toEqual(['metadata:save', 'blob:remove:id-2']);
  });
});
