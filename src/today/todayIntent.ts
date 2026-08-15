export type ModuleIntent =
  | { id: number; type: 'emotion.record' }
  | { id: number; type: 'health.quick-record' }
  | { id: number; type: 'tasks.create' }
  | { id: number; type: 'tasks.complete'; taskId: string };

export type IntentProps<T extends ModuleIntent['type']> = {
  intent?: Extract<ModuleIntent, { type: T }> | null;
  onIntentConsumed?(): void;
};
