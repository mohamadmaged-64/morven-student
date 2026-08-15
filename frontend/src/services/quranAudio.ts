const DB_NAME = 'morven-quran-audio';
const DB_VERSION = 1;
const META_STORE = 'meta';
const BLOB_STORE = 'blobs';

export interface QuranAudioMeta {
  key: string;
  reciterId: string;
  reciterName: string;
  reciterNameAr: string;
  surahId: number;
  surahName: string;
  surahNameAr: string;
  size: number;
  date: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(META_STORE)) {
        const meta = db.createObjectStore(META_STORE, { keyPath: 'key' });
        meta.createIndex('reciterId', 'reciterId', { unique: false });
        meta.createIndex('surahId', 'surahId', { unique: false });
      }
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

export function getQuranAudioDb(): Promise<IDBDatabase> | null {
  if (typeof indexedDB === 'undefined') return null;
  if (!dbPromise) dbPromise = openDb();
  return dbPromise;
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

export async function getDownloadedMetaAll(): Promise<QuranAudioMeta[]> {
  const dbPromise = getQuranAudioDb();
  if (!dbPromise) return [];
  const db = await dbPromise;
  const tx = db.transaction(META_STORE, 'readonly');
  const req = tx.objectStore(META_STORE).getAll();
  const records = await requestToPromise(req);
  return (records as QuranAudioMeta[]).sort((a, b) => b.date - a.date);
}

export async function getDownloadedMeta(key: string): Promise<QuranAudioMeta | null> {
  const dbPromise = getQuranAudioDb();
  if (!dbPromise) return null;
  const db = await dbPromise;
  const tx = db.transaction(META_STORE, 'readonly');
  const req = tx.objectStore(META_STORE).get(key);
  const record = await requestToPromise(req);
  return (record as QuranAudioMeta | undefined) ?? null;
}

export async function putDownloaded(
  meta: QuranAudioMeta,
  blob: Blob,
): Promise<void> {
  const dbPromise = getQuranAudioDb();
  if (!dbPromise) return;
  const db = await dbPromise;
  const tx = db.transaction([META_STORE, BLOB_STORE], 'readwrite');
  tx.objectStore(META_STORE).put(meta);
  tx.objectStore(BLOB_STORE).put({ key: meta.key, blob });
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
  });
}

export async function getDownloadedBlob(key: string): Promise<Blob | null> {
  const dbPromise = getQuranAudioDb();
  if (!dbPromise) return null;
  const db = await dbPromise;
  const tx = db.transaction(BLOB_STORE, 'readonly');
  const req = tx.objectStore(BLOB_STORE).get(key);
  const record = await requestToPromise(req);
  return (record as { key: string; blob: Blob } | undefined)?.blob ?? null;
}

export async function deleteDownloaded(key: string): Promise<void> {
  const dbPromise = getQuranAudioDb();
  if (!dbPromise) return;
  const db = await dbPromise;
  const tx = db.transaction([META_STORE, BLOB_STORE], 'readwrite');
  tx.objectStore(META_STORE).delete(key);
  tx.objectStore(BLOB_STORE).delete(key);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
  });
}
