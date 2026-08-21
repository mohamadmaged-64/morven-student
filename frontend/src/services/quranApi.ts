import { useState, useEffect, useCallback } from 'react';
import type { Reciter, Surah } from '@/types/quran';

const FEATURED_RECITER_IDS: string[] = [
  "5", // أحمد العجمي
  "12", //  ادريس أبكر
  "51",  // عبدالباسط عبدالصمد
  "92",  // ياسر الدوسري
  "86",  // ناصر القطامي
  "107", // محمد اللحيدان
  "112", // محمد صديق المنشاوي
  "102", // ماهر المعيقلي
  "217", // بندر بليله
  "231", // هزاع البلوشي
  "253", // اسلام صبحي
];

async function fetchRecitersInternal(): Promise<Reciter[]> {
  const res = await fetch('https://mp3quran.net/api/v3/reciters?language=ar');

  if (!res.ok) {
    throw new Error('Failed to fetch reciters');
  }

  const data = await res.json();

  const allReciters: Reciter[] = (data.reciters as any[])
    .filter(
      (r: any) =>
        r.moshaf &&
        r.moshaf.length > 0 &&
        r.moshaf[0].server,
    )
    .map((r: any) => {
      const moshaf = r.moshaf[0];

      return {
        id: String(r.id),
        name: r.name,
        style: moshaf?.name || '',
        server: moshaf.server.replace(/\/?$/, '/'),
      };
    });

  return FEATURED_RECITER_IDS.length > 0
    ? allReciters.filter((reciter) => FEATURED_RECITER_IDS.includes(reciter.id))
    : allReciters;
}

async function fetchSurahsInternal(): Promise<Surah[]> {
  const res = await fetch('https://mp3quran.net/api/v3/suwar?language=ar');

  if (!res.ok) {
    throw new Error('Failed to fetch surahs');
  }

  const data = await res.json();

  return (data.suwar as any[]).map((s: any) => ({
    id: s.id,
    name: s.name.trim(),
  }));
}

export function useQuranData() {
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadFlag, setReloadFlag] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (mounted) {
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);

        const [recitersData, surahsData] = await Promise.all([
          fetchRecitersInternal(),
          fetchSurahsInternal(),
        ]);

        if (mounted) {
          setReciters(recitersData);
          setSurahs(surahsData);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load Quran data',
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [reloadFlag]);

  const refetch = useCallback(() => setReloadFlag((f) => f + 1), []);

  return {
    reciters,
    surahs,
    loading,
    error,
    refetch,
  };
}
