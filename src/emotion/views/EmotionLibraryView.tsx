import { Bookmark, Images, Music2, NotebookText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { filterLibraryItems } from '../emotionEngine';
import type { EmotionLibraryItem, EmotionLibraryTab } from '../types';
import { EmotionIcon } from '../components/EmotionIcon';
import { EmotionGardenIllustration } from '../components/EmotionGardenIllustration';

const tabs: Array<{ id: EmotionLibraryTab; label: string }> = [
  { id: 'all', label: '全部' }, { id: 'diary', label: '日记' }, { id: 'media', label: '媒体' }
];

export function EmotionLibraryView({ items, onOpen }: { items: EmotionLibraryItem[]; onOpen: (entryId: string) => void }) {
  const [tab, setTab] = useState<EmotionLibraryTab>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const visible = useMemo(() => filterLibraryItems(items, tab).filter((item) => !favoritesOnly || item.isFavorite), [favoritesOnly, items, tab]);
  return <div className="emotion-view">
    <header className="emotion-view-header"><div><span className="emotion-eyebrow"><Bookmark /> MEMORY BOX</span><h1>我的收藏库</h1><p>文字、图片、视频、语音和音乐都会回到它发生的那一天。</p></div></header>
    <div className="emotion-library-toolbar">
      <div className="emotion-segmented" role="group" aria-label="筛选内容类型">{tabs.map((item) => <button key={item.id} type="button" style={{ minHeight: 44 }} aria-pressed={tab === item.id} onClick={() => setTab(item.id)}>{item.id === 'diary' && <NotebookText />}{item.id === 'media' && <Images />}{item.label}</button>)}</div>
      <button className={`emotion-filter-button${favoritesOnly ? ' is-active' : ''}`} type="button" aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly((value) => !value)}><Bookmark />只看收藏</button>
    </div>
    {!visible.length ? <div className="emotion-empty-state emotion-empty-state--compact"><EmotionGardenIllustration compact /><h2>这里还空空的</h2><p>保存或收藏记录后，内容会自动出现在这里。</p></div> :
      <div className="emotion-library-grid">{visible.map((item) => <button type="button" className={`emotion-library-card emotion-library-card--${item.kind}`} key={item.id} onClick={() => onOpen(item.sourceEntryId)}>
        <div className="emotion-library-card__preview">{item.kind === 'diary' ? <NotebookText /> : item.kind === 'image' ? <Images /> : item.kind === 'video' ? <span className="emotion-video-mark">▶</span> : item.kind === 'music' ? <Music2 /> : <span className="emotion-audio-wave">|||</span>}</div>
        <div className="emotion-library-card__body"><EmotionIcon moodId={item.moodId} size="small" /><div><time>{new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(item.createdAt))}</time><p>{item.music?.title || item.note || item.attachment?.fileName || '一段此刻的内容'}</p></div></div>
      </button>)}</div>}
  </div>;
}
