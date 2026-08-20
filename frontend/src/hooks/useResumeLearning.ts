import { useState, useEffect, useCallback } from 'react';
import type { ResumeItem } from '@/types';
import * as resumeStorage from '@/services/resumeStorage';

export function useResumeLearning() {
  const [items, setItems] = useState<ResumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const all = await resumeStorage.getAllResumeItems();
      setItems(all.sort((a, b) => b.updatedAt - a.updatedAt));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load resume items');
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const save = useCallback(
    async (toolId: string, label: string, progress: Record<string, unknown>, existingId?: string) => {
      const saved = await resumeStorage.saveResumeItem({ id: existingId, toolId, label, progress });
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.id === saved.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next.sort((a, b) => b.updatedAt - a.updatedAt);
        }
        return [saved, ...prev];
      });
      return saved;
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    await resumeStorage.deleteResumeItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(async () => {
    await resumeStorage.clearAllResumeItems();
    setItems([]);
  }, []);

  return { items, loading, error, save, remove, clear, refresh };
}
