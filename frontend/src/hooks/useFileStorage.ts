import { useState, useEffect, useCallback } from 'react';
import type { PersistentFile } from '@/types';
import * as fileStorage from '@/services/fileStorage';

export function useFileStorage() {
  const [files, setFiles] = useState<PersistentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const all = await fileStorage.getAllFiles();
      setFiles(all.sort((a, b) => b.createdAt - a.createdAt));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load files');
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const upload = useCallback(
    async (name: string, type: string, data: ArrayBuffer) => {
      const saved = await fileStorage.saveFile(name, type, data);
      setFiles((prev) => [saved, ...prev]);
      return saved;
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    await fileStorage.deleteFile(id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clear = useCallback(async () => {
    await fileStorage.clearAllFiles();
    setFiles([]);
  }, []);

  const getFileData = useCallback(async (id: string) => {
    return fileStorage.getFile(id);
  }, []);

  return { files, loading, error, upload, remove, clear, refresh };
}
