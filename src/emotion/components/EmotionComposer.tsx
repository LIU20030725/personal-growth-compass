import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Mic, Music2, Square, Trash2, Video, X } from 'lucide-react';
import { activityGroups, activityPresets, moodGroups, moodPresets } from '../emotionConfig';
import { canBrowserPlay, MEDIA_LIMITS, probeMediaDuration, validateMediaCandidate } from '../emotionMediaValidation';
import type { EmotionAttachment, EmotionAttachmentInput, EmotionDraft } from '../types';
import { EmotionIcon } from './EmotionIcon';
import { EmotionAudioPlayer } from './EmotionAudioPlayer';
import { EmotionActivityIcon } from './EmotionActivityIcon';
import { EmotionMusicPicker } from './EmotionMusicPicker';

interface EmotionComposerProps {
  initial?: EmotionDraft;
  onSave: (draft: EmotionDraft, attachments?: EmotionAttachmentInput[]) => Promise<string | boolean | null>;
  onClose: () => void;
  getBlob?: (attachmentId: string) => Promise<Blob | null>;
}

interface AttachmentPreviewProps {
  attachment: EmotionAttachment | EmotionAttachmentInput;
  getBlob?: (attachmentId: string) => Promise<Blob | null>;
  onRemove: () => void;
}

const emptyDraft: EmotionDraft = { moodId: '', activityIds: [], note: '', attachments: [], music: [] };
const focusableSelector = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

function AttachmentPreview({ attachment, getBlob, onRemove }: AttachmentPreviewProps) {
  const [url, setUrl] = useState('');
  const isPending = 'blob' in attachment;

  useEffect(() => {
    let disposed = false;
    let objectUrl = '';
    async function load() {
      const blob = isPending ? attachment.blob : await getBlob?.(attachment.id);
      if (!blob || disposed || !URL.createObjectURL) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }
    void load();
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment, getBlob, isPending]);

  const label = attachment.kind === 'image' ? '图片' : attachment.kind === 'video' ? '视频' : '语音';
  return <article className="emotion-attachment-preview">
    <div className="emotion-attachment-preview__media">
      {attachment.kind === 'image' && url && <img src={url} alt={attachment.fileName} />}
      {attachment.kind === 'video' && url && <video src={url} controls preload="metadata" aria-label={attachment.fileName} />}
      {attachment.kind === 'audio' && url && <EmotionAudioPlayer src={url} label={attachment.fileName} durationMs={attachment.durationMs} />}
      {!url && <span>{label}</span>}
    </div>
    <div><strong>{attachment.fileName}</strong><span>{label}</span></div>
    <button type="button" aria-label={`移除 ${attachment.fileName}`} onClick={onRemove}><Trash2 /></button>
  </article>;
}

export function EmotionComposer({ initial = emptyDraft, onSave, onClose, getBlob }: EmotionComposerProps) {
  const [draft, setDraft] = useState(initial);
  const [pending, setPending] = useState<EmotionAttachmentInput[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [musicPickerOpen, setMusicPickerOpen] = useState(false);
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef(0);
  const recordingIntervalRef = useRef<number | null>(null);
  const recordingLimitRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const dirty = Boolean(
    draft.moodId !== initial.moodId ||
    JSON.stringify(draft.activityIds) !== JSON.stringify(initial.activityIds) ||
    draft.note !== initial.note || pending.length ||
    JSON.stringify(draft.attachments) !== JSON.stringify(initial.attachments) ||
    JSON.stringify(draft.music ?? []) !== JSON.stringify(initial.music ?? [])
  );

  const music = draft.music?.[0];

  const counts = useMemo(() => ({
    images: pending.filter((item) => item.kind === 'image').length + draft.attachments.filter((item) => item.kind === 'image').length,
    videos: pending.filter((item) => item.kind === 'video').length + draft.attachments.filter((item) => item.kind === 'video').length,
    audio: pending.filter((item) => item.kind === 'audio').length + draft.attachments.filter((item) => item.kind === 'audio').length
  }), [draft.attachments, pending]);

  const clearRecordingTimers = useCallback(() => {
    if (recordingIntervalRef.current !== null) window.clearInterval(recordingIntervalRef.current);
    if (recordingLimitRef.current !== null) window.clearTimeout(recordingLimitRef.current);
    recordingIntervalRef.current = null;
    recordingLimitRef.current = null;
  }, []);

  const stopTracks = useCallback(() => {
    const stream = streamRef.current;
    streamRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const stopRecording = useCallback((discard = false) => {
    clearRecordingTimers();
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== 'inactive') {
      if (discard) recorder.onstop = null;
      recorder.stop();
    }
    stopTracks();
    if (mountedRef.current) {
      setRecording(false);
      setRecordingSeconds(0);
    }
  }, [clearRecordingTimers, stopTracks]);

  const close = useCallback(() => {
    if (saving) return;
    stopRecording(true);
    if (dirty && !window.confirm('这次记录还没有保存，确定离开吗？')) return;
    onClose();
  }, [dirty, onClose, saving, stopRecording]);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [close]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopRecording(true);
    };
  }, [stopRecording]);

  async function addFiles(files: FileList | null, kind: 'image' | 'video', input: HTMLInputElement) {
    if (!files) return;
    const next: EmotionAttachmentInput[] = [];
    for (const file of Array.from(files)) {
      let durationMs: number | null = null;
      let playable = true;
      if (kind === 'video') {
        playable = canBrowserPlay('video', file.type);
        if (playable) {
          try { durationMs = await probeMediaDuration(file, 'video'); }
          catch { durationMs = null; }
        }
      }
      const existingCount = (kind === 'image' ? counts.images : counts.videos) + next.filter((item) => item.kind === kind).length;
      const validation = validateMediaCandidate({ kind, size: file.size, mimeType: file.type, durationMs, existingCount, playable });
      if (validation) { setMessage(validation); continue; }
      next.push({ blob: file, kind, fileName: file.name, mimeType: file.type, durationMs });
    }
    input.value = '';
    if (next.length) {
      setPending((items) => [...items, ...next]);
      setMessage('');
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder) {
      setMessage('当前浏览器暂不支持语音记录');
      return;
    }
    stopRecording(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recordingStartedAtRef.current = Date.now();
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        clearRecordingTimers();
        stopTracks();
        const durationMs = Math.min(Date.now() - recordingStartedAtRef.current, MEDIA_LIMITS.audioDurationMs);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const validation = validateMediaCandidate({
          kind: 'audio', size: blob.size, mimeType: blob.type, durationMs,
          existingCount: draft.attachments.filter((item) => item.kind === 'audio').length,
          playable: true
        });
        if (mountedRef.current) {
          if (validation) setMessage(validation);
          else {
            setPending((items) => [...items.filter((item) => item.kind !== 'audio'), {
              blob, kind: 'audio', fileName: `语音-${Date.now()}.webm`, mimeType: blob.type, durationMs
            }]);
            setMessage('');
          }
          setRecording(false);
          setRecordingSeconds(0);
        }
      };
      recorder.start();
      setRecording(true);
      setRecordingSeconds(0);
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds(Math.floor((Date.now() - recordingStartedAtRef.current) / 1000));
      }, 1000);
      recordingLimitRef.current = window.setTimeout(() => stopRecording(false), MEDIA_LIMITS.audioDurationMs);
    } catch {
      stopRecording(true);
      setMessage('没有获得麦克风权限，可继续使用文字、图片和视频');
    }
  }

  async function submit() {
    if (!draft.moodId) { setMessage('先选择一个最接近此刻的情绪'); return; }
    if (recording) { setMessage('请先结束录音，确认语音已添加后再保存'); return; }
    setSaving(true);
    setMessage('');
    try {
      const result = await onSave(draft, pending);
      if (result) onClose();
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }

  const allAttachments = draft.attachments.length + pending.length;

  return (
    <div className="emotion-composer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section ref={dialogRef} className="emotion-composer" role="dialog" aria-modal="true" aria-labelledby="emotion-composer-title">
        <header className="emotion-composer__header">
          <button ref={closeButtonRef} className="emotion-icon-button" type="button" aria-label="关闭记录" onClick={close} disabled={saving}><X /></button>
          <div><span>NEW MOMENT</span><h2 id="emotion-composer-title">记录此刻感受</h2></div>
          <button className="emotion-save-link" type="button" onClick={submit} disabled={saving || recording}>{saving ? '保存中' : '保存'}</button>
        </header>

        <div className="emotion-composer__body">
          <section className="emotion-form-section">
            <div className="emotion-section-heading"><span>01</span><div><h3>此刻，你是什么状态？</h3><p>只选一个最接近的就好</p></div></div>
            {moodGroups.map((group) => <div className="emotion-choice-group" key={group.id}>
              <h4>{group.label}</h4>
              <div className="emotion-mood-grid" role="radiogroup" aria-label={group.label}>
                {moodPresets.filter((mood) => mood.group === group.id).map((mood) => <button
                  key={mood.id} className={`emotion-mood-choice${draft.moodId === mood.id ? ' is-selected' : ''}`}
                  type="button" role="radio" aria-checked={draft.moodId === mood.id} aria-label={mood.label}
                  onClick={() => setDraft((value) => ({ ...value, moodId: mood.id }))}
                ><EmotionIcon moodId={mood.id} size="medium" selected={draft.moodId === mood.id} /><span>{mood.label}</span></button>)}
              </div>
            </div>)}
          </section>

          <section className="emotion-form-section">
            <div className="emotion-section-heading"><span>02</span><div><h3>刚刚在做什么？</h3><p>可以选择多个活动</p></div></div>
            {activityGroups.map((group) => <div className="emotion-activity-group" key={group.id}>
              <h4>{group.label}</h4>
              <div className="emotion-activity-grid">{activityPresets.filter((activity) => activity.group === group.id).map((activity) => {
                const selected = draft.activityIds.includes(activity.id);
                return <button type="button" role="checkbox" aria-checked={selected} aria-label={activity.label}
                  className={`emotion-activity-chip${selected ? ' is-selected' : ''}`} key={activity.id}
                  onClick={() => setDraft((value) => ({ ...value, activityIds: selected ? value.activityIds.filter((id) => id !== activity.id) : [...value.activityIds, activity.id] }))}
                ><EmotionActivityIcon activityId={activity.id} /><span>{activity.label}</span></button>;
              })}</div>
            </div>)}
          </section>

          <section className="emotion-form-section">
            <div className="emotion-section-heading"><span>03</span><div><h3>为这一刻留点什么</h3><p>内容都可以跳过，情绪本身就是记录</p></div></div>
            <label className="emotion-note-label" htmlFor="emotion-note">文字日记</label>
            <textarea id="emotion-note" value={draft.note} maxLength={5000} placeholder="发生了什么？你想记住什么？"
              onChange={(event) => setDraft((value) => ({ ...value, note: event.target.value }))} />
            <div className="emotion-note-count">{draft.note.length}/5000</div>
            <div className="emotion-attachment-actions">
              <label className="emotion-attachment-button"><Camera />图片<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void addFiles(event.target.files, 'image', event.currentTarget)} /></label>
              <label className="emotion-attachment-button"><Video />视频<input type="file" accept="video/*" onChange={(event) => void addFiles(event.target.files, 'video', event.currentTarget)} /></label>
              <button className={`emotion-attachment-button${recording ? ' is-recording' : ''}`} type="button" aria-label={recording ? '结束录音' : '语音'} onClick={recording ? () => stopRecording(false) : startRecording} disabled={!recording && counts.audio >= 1}>
                {recording ? <Square /> : <Mic />}{recording ? `结束录音 ${Math.floor(recordingSeconds / 60)}:${String(recordingSeconds % 60).padStart(2, '0')}` : '语音'}
              </button>
              <button className={`emotion-attachment-button${music ? ' is-added' : ''}`} type="button" aria-label="音乐" onClick={() => setMusicPickerOpen(true)}>
                <Music2 />音乐
              </button>
            </div>
            {allAttachments > 0 && <div className="emotion-pending-list">已添加 {allAttachments} 项内容 · 图片 {counts.images} · 视频 {counts.videos} · 语音 {counts.audio}</div>}
            {allAttachments > 0 && <div className="emotion-attachment-preview-list" aria-label="已添加附件">
              {draft.attachments.map((attachment) => <AttachmentPreview key={attachment.id} attachment={attachment} getBlob={getBlob}
                onRemove={() => setDraft((value) => ({ ...value, attachments: value.attachments.filter((item) => item.id !== attachment.id) }))} />)}
              {pending.map((attachment, index) => <AttachmentPreview key={`${attachment.fileName}-${index}`} attachment={attachment}
                onRemove={() => setPending((items) => items.filter((_, itemIndex) => itemIndex !== index))} />)}
            </div>}
            {musicPickerOpen && <EmotionMusicPicker
              initialText={music?.sourceUrl}
              onCancel={() => setMusicPickerOpen(false)}
              onConfirm={(nextMusic) => { setDraft((current) => ({ ...current, music: [nextMusic] })); setMusicPickerOpen(false); }}
            />}
            {music && !musicPickerOpen && <article className="emotion-music-selection">
              <span aria-hidden="true"><Music2 /></span><div><strong>{music.title}</strong><span>{music.artist || (music.provider === 'netease' ? '网易云音乐' : music.provider === 'qq' ? 'QQ 音乐' : '音乐网页')}</span></div>
              <button type="button" onClick={() => setMusicPickerOpen(true)}>更换</button>
              <button type="button" aria-label={`移除音乐 ${music.title}`} onClick={() => setDraft((current) => ({ ...current, music: [] }))}><Trash2 /></button>
            </article>}
          </section>
          {message && <p className="emotion-form-message" aria-live="polite">{message}</p>}
        </div>
        <footer className="emotion-composer__footer">
          <button className="emotion-primary-button" type="button" onClick={submit} disabled={saving || recording}>{saving ? '正在收好…' : '保存这一刻'}</button>
        </footer>
      </section>
    </div>
  );
}
