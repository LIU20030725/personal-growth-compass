import { CalendarPlus, PenLine, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

export function EmotionCreateMenu({ onRecord, onImportantDay, onClose }: {
  onRecord: () => void;
  onImportantDay: () => void;
  onClose: () => void;
}) {
  const firstRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    firstRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return <div className="emotion-sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section ref={dialogRef} className="emotion-create-menu" role="dialog" aria-modal="true" aria-labelledby="emotion-create-menu-title">
      <header><div><span>ADD TO YOUR GARDEN</span><h2 id="emotion-create-menu-title">选择要添加的内容</h2></div><button type="button" aria-label="关闭添加菜单" onClick={onClose}><X /></button></header>
      <div className="emotion-create-menu__choices">
        <button ref={firstRef} type="button" aria-label="记录此刻" onClick={onRecord}><PenLine /><span><strong>记录此刻</strong><small>情绪、活动、文字和声音</small></span></button>
        <button type="button" aria-label="添加重要日" onClick={onImportantDay}><CalendarPlus /><span><strong>添加重要日</strong><small>在心情日历留下一个星标</small></span></button>
      </div>
    </section>
  </div>;
}
