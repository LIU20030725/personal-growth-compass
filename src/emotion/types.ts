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
  isFavorite: boolean;
}

export interface EmotionStateV1 {
  schemaVersion: 1;
  entries: EmotionEntry[];
}

export interface EmotionDraft {
  moodId: string;
  activityIds: string[];
  note: string;
  attachments: EmotionAttachment[];
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
export type EmotionLibraryItemKind = 'diary' | EmotionAttachmentKind;

export interface EmotionLibraryItem {
  id: string;
  kind: EmotionLibraryItemKind;
  sourceEntryId: string;
  createdAt: string;
  moodId: string;
  note: string;
  attachment: EmotionAttachment | null;
  isFavorite: boolean;
}

export interface EmotionCalendarDaySummary {
  dateKey: string;
  moodId: string;
  count: number;
  entryId: string;
}
