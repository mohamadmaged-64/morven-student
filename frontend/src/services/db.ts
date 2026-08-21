const DB_NAME = 'morven-storage';
const DB_VERSION = 3;
const FILE_STORE = 'files';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(FILE_STORE)) {
          const fileStore = db.createObjectStore(FILE_STORE, { keyPath: 'id' });
          fileStore.createIndex('name', 'name', { unique: false });
          fileStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (db.objectStoreNames.contains('resume')) {
          db.deleteObjectStore('resume');
        }

        if (db.objectStoreNames.contains('activity')) {
          db.deleteObjectStore('activity');
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

export { openDB, FILE_STORE };
