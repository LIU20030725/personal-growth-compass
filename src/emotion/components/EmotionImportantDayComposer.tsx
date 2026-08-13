import { Star, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { EmotionImportantDay } from '../types';

type ImportantDayDraft = Pick<EmotionImportantDay, 'title' | 'dateKey' | 'note' | 'remindDaysBefore' | 'repeat'>;

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function EmotionImportantDayComposer({ onSave, onClose }: {
  onSave: (draft: ImportantDayDraft) => boolean;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ImportantDayDraft>({ title: '', dateKey: localToday(), note: '', remindDaysBefore: 1, repeat: 'none' });
  const titleRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    titleRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return <div className="emotion-sheet-backdrop" role="presentation">
    <section ref={dialogRef} className="emotion-important-composer" role="dialog" aria-modal="true" aria-labelledby="emotion-important-title">
      <header><div><span><Star /> IMPORTANT DAY</span><h2 id="emotion-important-title">添加重要日</h2></div><button type="button" aria-label="关闭重要日" onClick={onClose}><X /></button></header>
      <div className="emotion-important-composer__body">
        <label>重要日名称<input ref={titleRef} value={draft.title} maxLength={40} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <label>日期<input type="date" value={draft.dateKey} onChange={(event) => setDraft({ ...draft, dateKey: event.target.value })} /></label>
        <label>提前提醒<select value={draft.remindDaysBefore} onChange={(event) => setDraft({ ...draft, remindDaysBefore: Number(event.target.value) as ImportantDayDraft['remindDaysBefore'] })}><option value={0}>当天</option><option value={1}>提前 1 天</option><option value={3}>提前 3 天</option><option value={7}>提前 7 天</option><option value={30}>提前 30 天</option></select></label>
        <label className="emotion-important-composer__repeat"><input type="checkbox" checked={draft.repeat === 'yearly'} onChange={(event) => setDraft({ ...draft, repeat: event.target.checked ? 'yearly' : 'none' })} />每年重复</label>
        <label>备注<textarea value={draft.note} maxLength={200} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label>
      </div>
      <footer><button type="button" className="emotion-primary-button" onClick={() => { if (onSave(draft)) onClose(); }}>保存重要日</button></footer>
    </section>
  </div>;
}
