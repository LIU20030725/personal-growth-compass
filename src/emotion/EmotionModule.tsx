import { useEffect, useRef, useState } from 'react';
import { BookOpenText, CalendarDays, Images, LockKeyhole, Plus, Sparkles, Star } from 'lucide-react';
import { getEntriesByLocalDate, getImportantDaysForDate } from './emotionEngine';
import { useEmotionSystem } from './useEmotionSystem';
import type { EmotionDraft } from './types';
import { EmotionComposer } from './components/EmotionComposer';
import { EmotionEntryDetail } from './components/EmotionEntryDetail';
import { EmotionCalendarView } from './views/EmotionCalendarView';
import { EmotionDayView } from './views/EmotionDayView';
import { EmotionJournalView } from './views/EmotionJournalView';
import { EmotionLibraryView } from './views/EmotionLibraryView';
import { EmotionCreateMenu } from './components/EmotionCreateMenu';
import { EmotionImportantDayComposer } from './components/EmotionImportantDayComposer';
import './emotionModule.css';
import './emotionEnhancements.css';

type MainRoute = { name: 'journal' } | { name: 'library' } | { name: 'calendar'; month: string };
type EmotionRoute = MainRoute |
  { name: 'day'; dateKey: string; returnTo: MainRoute } |
  { name: 'detail'; entryId: string; returnTo: MainRoute | { name: 'day'; dateKey: string; returnTo: MainRoute } };

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMainRoute(route: EmotionRoute): MainRoute {
  if (route.name === 'detail') return route.returnTo.name === 'day' ? route.returnTo.returnTo : route.returnTo;
  if (route.name === 'day') return route.returnTo;
  return route;
}

export function EmotionModule() {
  const system = useEmotionSystem();
  const [route, setRoute] = useState<EmotionRoute>({ name: 'journal' });
  const [composer, setComposer] = useState<{ mode: 'create' } | { mode: 'edit'; entryId: string } | null>(null);
  const [createMenu, setCreateMenu] = useState(false);
  const [importantComposer, setImportantComposer] = useState(false);
  const [notice, setNotice] = useState('');
  const composerTriggerRef = useRef<HTMLElement | null>(null);
  const moduleRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = moduleRef.current;
    if (!node) return;
    const updateDockGeometry = () => {
      const bounds = node.getBoundingClientRect();
      node.style.setProperty('--emotion-module-left', `${Math.max(0, bounds.left)}px`);
      node.style.setProperty('--emotion-module-right', `${Math.max(0, window.innerWidth - bounds.right)}px`);
    };
    updateDockGeometry();
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateDockGeometry);
    resizeObserver?.observe(node);
    window.addEventListener('resize', updateDockGeometry);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateDockGeometry);
    };
  }, []);

  const mainRoute = getMainRoute(route);
  const activeTab = mainRoute.name;
  const editingEntry = composer?.mode === 'edit' ? system.entries.find((entry) => entry.id === composer.entryId) : null;

  function openDetail(entryId: string, from: EmotionRoute = route) {
    const returnTo = from.name === 'detail' ? from.returnTo : from.name === 'day' ? from : from as MainRoute;
    setRoute({ name: 'detail', entryId, returnTo });
  }

  function switchTab(name: 'journal' | 'library' | 'calendar') {
    if (name === 'calendar') setRoute({ name: 'calendar', month: currentMonth() });
    else if (name === 'library') setRoute({ name: 'library' });
    else setRoute({ name: 'journal' });
  }

  function openComposer(value: { mode: 'create' } | { mode: 'edit'; entryId: string }) {
    composerTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setComposer(value);
  }

  function closeComposer() {
    setComposer(null);
    window.setTimeout(() => composerTriggerRef.current?.focus(), 0);
  }

  function openCreateMenu() {
    composerTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setCreateMenu(true);
  }

  function closeAuxiliary() {
    setCreateMenu(false);
    setImportantComposer(false);
    window.setTimeout(() => composerTriggerRef.current?.focus(), 0);
  }

  function openImportantDay() {
    composerTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setImportantComposer(true);
  }

  async function saveMoment(draft: EmotionDraft, attachments: Parameters<typeof system.createEntry>[1]) {
    const result = composer?.mode === 'edit'
      ? await system.updateEntry(composer.entryId, draft, attachments)
      : await system.createEntry(draft, attachments);
    if (result) setNotice(composer?.mode === 'edit' ? '记录已更新' : '这一刻已收好');
    return result;
  }

  let content;
  if (route.name === 'journal') {
    content = <EmotionJournalView entries={system.entries} latestToday={system.latestTodayEntry} upcomingImportantDays={system.upcomingImportantDays} onOpen={openDetail} onFavorite={system.toggleEntryFavorite} />;
  } else if (route.name === 'library') {
    content = <EmotionLibraryView items={system.libraryItems} onOpen={openDetail} />;
  } else if (route.name === 'calendar') {
    content = <EmotionCalendarView entries={system.entries} importantDays={system.importantDays} month={route.month} onMonth={(month) => setRoute({ name: 'calendar', month })} onOpenDay={(dateKey) => setRoute({ name: 'day', dateKey, returnTo: route })} onOpenEntry={(entryId) => openDetail(entryId, route)} />;
  } else if (route.name === 'day') {
    content = <EmotionDayView dateKey={route.dateKey} entries={getEntriesByLocalDate(system.entries, route.dateKey)} importantDays={getImportantDaysForDate(system.importantDays, route.dateKey)} onBack={() => setRoute(route.returnTo)} onOpen={(id) => openDetail(id, route)} onCreate={() => openComposer({ mode: 'create' })} />;
  } else {
    const entry = system.entries.find((item) => item.id === route.entryId);
    content = entry ? <EmotionEntryDetail
      entry={entry}
      getBlob={system.getAttachmentBlob}
      onBack={() => setRoute(route.returnTo)}
      onEdit={() => openComposer({ mode: 'edit', entryId: entry.id })}
      onFavorite={() => system.toggleEntryFavorite(entry.id)}
      onAttachmentFavorite={(attachmentId) => system.toggleAttachmentFavorite(entry.id, attachmentId)}
      onDelete={async () => {
        if (!window.confirm('确定删除这条记录吗？相关媒体也会从本设备移除。')) return;
        if (await system.removeEntry(entry.id)) setRoute(route.returnTo);
      }}
    /> : <div className="emotion-empty-state"><h2>没有找到这条记录</h2><button type="button" onClick={() => setRoute({ name: 'journal' })}>返回日记</button></div>;
  }

  const initialDraft: EmotionDraft | undefined = editingEntry ? {
    moodId: editingEntry.moodId,
    activityIds: editingEntry.activityIds,
    note: editingEntry.note,
    attachments: editingEntry.attachments,
    music: editingEntry.music ?? []
  } : undefined;

  const viewCopy = activeTab === 'library'
    ? { eyebrow: '心情收纳箱', title: '我的收藏库', description: '文字与媒体都按发生的那一天安静归档。' }
    : activeTab === 'calendar'
      ? { eyebrow: '回看时间', title: '心情日历', description: '看见变化，不把任何一天定义成好或坏。' }
      : { eyebrow: '私人时刻', title: '我的心情', description: '不需要评价，只需要诚实地留下一刻。' };

  return <section ref={moduleRef} className="emotion-module" aria-label="情绪记录">
    <div className="emotion-module__canvas">
      {(route.name === 'journal' || route.name === 'library' || route.name === 'calendar') && <header className="emotion-workspace-header">
        <div className="emotion-workspace-header__copy">
          <span className="emotion-eyebrow"><Sparkles />{viewCopy.eyebrow}</span>
          <h1>{viewCopy.title}</h1>
          <p>{viewCopy.description}</p>
        </div>
        <div className="emotion-workspace-header__actions">
          <span className="emotion-private-badge"><LockKeyhole />仅自己可见</span>
          <button className="emotion-secondary-action" type="button" onClick={openImportantDay}><Star />添加重要日</button>
          <button className="emotion-workspace-primary" type="button" onClick={() => openComposer({ mode: 'create' })}><Plus />记录此刻</button>
        </div>
      </header>}
      <div className="emotion-dock">
        <nav className="emotion-bottom-nav" aria-label="情绪模块导航">
          <button type="button" aria-current={activeTab === 'journal' ? 'page' : undefined} onClick={() => switchTab('journal')}><BookOpenText /><span>日记</span></button>
          <button type="button" aria-current={activeTab === 'library' ? 'page' : undefined} onClick={() => switchTab('library')}><Images /><span>内容库</span></button>
          <button type="button" aria-current={activeTab === 'calendar' ? 'page' : undefined} onClick={() => switchTab('calendar')}><CalendarDays /><span>心情日历</span></button>
        </nav>
        <button className="emotion-fab" type="button" aria-label="记录感受" onClick={openCreateMenu}><Plus /><span>记录感受</span></button>
      </div>
      {content}
    </div>
    {notice && <div className="emotion-feedback" role="status">{notice}<button type="button" aria-label="关闭提示" onClick={() => setNotice('')}>×</button></div>}
    {system.error && <div className="emotion-error-toast" role="alert">{system.error}<button type="button" onClick={system.clearError}>知道了</button></div>}
    {composer && <EmotionComposer
      initial={initialDraft}
      getBlob={system.getAttachmentBlob}
      onClose={closeComposer}
      onSave={saveMoment}
    />}
    {createMenu && <EmotionCreateMenu onClose={closeAuxiliary} onRecord={() => { setCreateMenu(false); setComposer({ mode: 'create' }); }} onImportantDay={() => { setCreateMenu(false); setImportantComposer(true); }} />}
    {importantComposer && <EmotionImportantDayComposer onClose={closeAuxiliary} onSave={system.createImportantDay} />}
  </section>;
}
