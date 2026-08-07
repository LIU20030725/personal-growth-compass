import { useEffect, useRef, useState } from 'react';
import { BookOpenText, CalendarDays, Images, Plus } from 'lucide-react';
import { getEntriesByLocalDate } from './emotionEngine';
import { useEmotionSystem } from './useEmotionSystem';
import type { EmotionDraft } from './types';
import { EmotionComposer } from './components/EmotionComposer';
import { EmotionEntryDetail } from './components/EmotionEntryDetail';
import { EmotionCalendarView } from './views/EmotionCalendarView';
import { EmotionDayView } from './views/EmotionDayView';
import { EmotionJournalView } from './views/EmotionJournalView';
import { EmotionLibraryView } from './views/EmotionLibraryView';
import './emotionModule.css';

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

  let content;
  if (route.name === 'journal') {
    content = <EmotionJournalView entries={system.entries} latestToday={system.latestTodayEntry} onOpen={openDetail} onFavorite={system.toggleEntryFavorite} />;
  } else if (route.name === 'library') {
    content = <EmotionLibraryView items={system.libraryItems} onOpen={openDetail} />;
  } else if (route.name === 'calendar') {
    content = <EmotionCalendarView entries={system.entries} month={route.month} onMonth={(month) => setRoute({ name: 'calendar', month })} onOpenDay={(dateKey) => setRoute({ name: 'day', dateKey, returnTo: route })} />;
  } else if (route.name === 'day') {
    content = <EmotionDayView dateKey={route.dateKey} entries={getEntriesByLocalDate(system.entries, route.dateKey)} onBack={() => setRoute(route.returnTo)} onOpen={(id) => openDetail(id, route)} />;
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
    attachments: editingEntry.attachments
  } : undefined;

  return <section ref={moduleRef} className="emotion-module" aria-label="情绪记录">
    <div className="emotion-module__canvas">{content}</div>
    {system.error && <div className="emotion-error-toast" aria-live="polite">{system.error}<button type="button" onClick={system.clearError}>知道了</button></div>}
    <div className="emotion-dock">
      <nav className="emotion-bottom-nav" aria-label="情绪模块导航">
        <button type="button" aria-current={activeTab === 'journal' ? 'page' : undefined} onClick={() => switchTab('journal')}><BookOpenText /><span>日记</span></button>
        <button type="button" aria-current={activeTab === 'library' ? 'page' : undefined} onClick={() => switchTab('library')}><Images /><span>内容库</span></button>
        <button type="button" aria-current={activeTab === 'calendar' ? 'page' : undefined} onClick={() => switchTab('calendar')}><CalendarDays /><span>心情日历</span></button>
      </nav>
      <button className="emotion-fab" type="button" aria-label="记录感受" onClick={() => openComposer({ mode: 'create' })}><Plus /><span>记录感受</span></button>
    </div>
    {composer && <EmotionComposer
      initial={initialDraft}
      getBlob={system.getAttachmentBlob}
      onClose={closeComposer}
      onSave={(draft, attachments) => composer.mode === 'edit'
        ? system.updateEntry(composer.entryId, draft, attachments)
        : system.createEntry(draft, attachments)}
    />}
  </section>;
}
