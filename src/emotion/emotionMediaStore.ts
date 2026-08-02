export interface EmotionMediaStore {
  put(id: string, blob: Blob): Promise<void>;
  get(id: string): Promise<Blob | null>;
  remove(id: string): Promise<void>;
  removeMany(ids: string[]): Promise<void>;
}

const DATABASE_NAME = 'dice-life-emotion-media';
const STORE_NAME = 'attachments';

export function createMemoryEmotionMediaStore(): EmotionMediaStore {
  const blobs = new Map<string, Blob>();
  return {
    async put(id, blob) { blobs.set(id, blob); },
    async get(id) { return blobs.get(id) ?? null; },
    async remove(id) { blobs.delete(id); },
    async removeMany(ids) { ids.forEach((id) => blobs.delete(id)); }
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('当前浏览器不支持本地媒体存储'));
      return;
    }
    const request = globalThis.indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('无法打开本地媒体存储'));
  });
}

function requestResult<T>(request: IDBRequest<T>, transaction: IDBTransaction): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? transaction.error ?? new Error('媒体存储操作失败'));
    transaction.onabort = () => reject(transaction.error ?? new Error('媒体存储事务已取消'));
  });
}

export function createIndexedDbEmotionMediaStore(): EmotionMediaStore {
  return {
    async put(id, blob) {
      const database = await openDatabase();
      try {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        await requestResult(transaction.objectStore(STORE_NAME).put(blob, id), transaction);
      } finally {
        database.close();
      }
    },
    async get(id) {
      const database = await openDatabase();
      try {
        const transaction = database.transaction(STORE_NAME, 'readonly');
        return (await requestResult(transaction.objectStore(STORE_NAME).get(id), transaction) as Blob | undefined) ?? null;
      } finally {
        database.close();
      }
    },
    async remove(id) {
      const database = await openDatabase();
      try {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        await requestResult(transaction.objectStore(STORE_NAME).delete(id), transaction);
      } finally {
        database.close();
      }
    },
    async removeMany(ids) {
      const database = await openDatabase();
      try {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        await Promise.all(ids.map((id) => requestResult(store.delete(id), transaction)));
      } finally {
        database.close();
      }
    }
  };
}
