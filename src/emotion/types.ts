export type EmotionAttachmentKind = 'image' | 'video' | 'audio';

export interface EmotionAttachment {
  id: string;
  kind: EmotionAttachmentKind;
  fileName: string;
  mimeType: string;
  size: number;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  isFavorite: boolean;
}

export interface EmotionEntry {
  id: string;
  createdAt: string;
  updatedAt: string;
  moodId: string;
  activityIds: string[];
  note: string;
  attachments: EmotionAttachment[];
  music?: EmotionMusicReference[];
  isFavorite: boolean;
}

export type EmotionMusicProvider = 'netease' | 'qq' | 'other';

export interface EmotionMusicReference {
  id: string;
  provider: EmotionMusicProvider;
  title: string;
  artist: string;
  sourceUrl: string;
  playbackUrl: string;
  isFavorite: boolean;
}

export interface EmotionImportantDay {
  id: string;
  title: string;
  dateKey: string;
  note: string;
  remindDaysBefore: 0 | 1 | 3 | 7 | 30;
  repeat: 'none' | 'yearly';
  createdAt: string;
  updatedAt: string;
}

export interface EmotionStateV1 {
  schemaVersion: 1;
  entries: EmotionEntry[];
}

export interface EmotionStateV2 {
  schemaVersion: 2;
  entries: EmotionEntry[];
  importantDays: EmotionImportantDay[];
}

export interface EmotionDraft {
  moodId: string;
  activityIds: string[];
  note: string;
  attachments: EmotionAttachment[];
  music?: EmotionMusicReference[];
}

export interface EmotionAttachmentInput {
  blob: Blob;
  kind: EmotionAttachmentKind;
  fileName: string;
  mimeType: string;
  durationMs?: number | null;
  width?: number | null;
  height?: number | null;
}

export type EmotionLibraryTab = 'all' | 'diary' | 'media';
export type EmotionLibraryItemKind = 'diary' | EmotionAttachmentKind | 'music';

export interface EmotionLibraryItem {
  id: string;
  kind: EmotionLibraryItemKind;
  sourceEntryId: string;
  createdAt: string;
  moodId: string;
  note: string;
  attachment: EmotionAttachment | null;
  music?: EmotionMusicReference | null;
  isFavorite: boolean;
}

export interface EmotionCalendarDaySummary {
  dateKey: string;
  moodId: string;
  count: number;
  entryId: string;
}
