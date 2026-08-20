import { v4 as uuid } from 'uuid';
import type { PersistentFile } from '@/types';
import { openDB, FILE_STORE } from './db';

async function getAllFiles(): Promise<PersistentFile[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, 'readonly');
    const store = tx.objectStore(FILE_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getFile(id: string): Promise<PersistentFile | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, 'readonly');
    const store = tx.objectStore(FILE_STORE);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveFile(name: string, type: string, data: ArrayBuffer): Promise<PersistentFile> {
  const file: PersistentFile = {
    id: uuid(),
    name,
    type,
    size: data.byteLength,
    data,
    createdAt: Date.now(),
  };
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, 'readwrite');
    const store = tx.objectStore(FILE_STORE);
    store.put(file);
    tx.oncomplete = () => resolve(file);
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteFile(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, 'readwrite');
    const store = tx.objectStore(FILE_STORE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearAllFiles(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, 'readwrite');
    const store = tx.objectStore(FILE_STORE);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export { getAllFiles, getFile, saveFile, deleteFile, clearAllFiles };
