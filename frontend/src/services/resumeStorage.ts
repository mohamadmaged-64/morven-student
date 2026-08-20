import type { ResumeItem } from '@/types';
import { openDB, RESUME_STORE } from './db';

export async function getAllResumeItems(): Promise<ResumeItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RESUME_STORE, 'readonly');
    const store = tx.objectStore(RESUME_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getResumeItem(id: string): Promise<ResumeItem | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RESUME_STORE, 'readonly');
    const store = tx.objectStore(RESUME_STORE);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveResumeItem(
  item: Omit<ResumeItem, 'id' | 'updatedAt'> & { id?: string },
): Promise<ResumeItem> {
  const existing = item.id ? await getResumeItem(item.id) : undefined;

  const record: ResumeItem = {
    id: existing?.id ?? crypto.randomUUID(),
    toolId: item.toolId,
    label: item.label,
    progress: item.progress,
    updatedAt: Date.now(),
  };

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RESUME_STORE, 'readwrite');
    const store = tx.objectStore(RESUME_STORE);
    store.put(record);
    tx.oncomplete = () => resolve(record);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteResumeItem(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RESUME_STORE, 'readwrite');
    const store = tx.objectStore(RESUME_STORE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllResumeItems(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RESUME_STORE, 'readwrite');
    const store = tx.objectStore(RESUME_STORE);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
