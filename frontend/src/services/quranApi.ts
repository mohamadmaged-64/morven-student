import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Reciter, Surah } from '@/types/quran';
import { getSurahList } from '@/data/quran';

const CACHE_DURATION = 0


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

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

let recitersCache: CacheEntry<Reciter[]> | null = null;

async function fetchRecitersInternal(): Promise<Reciter[]> {
  if (recitersCache && Date.now() - recitersCache.timestamp < CACHE_DURATION) {
    return recitersCache.data;
  }

  const [arRes, enRes] = await Promise.all([
    fetch('https://mp3quran.net/api/v3/reciters?language=ar'),
    fetch('https://mp3quran.net/api/v3/reciters?language=en'),
  ]);

  if (!arRes.ok || !enRes.ok) {
    throw new Error('Failed to fetch reciters');
  }

  const arData = await arRes.json();
  const enData = await enRes.json();

  const enMap = new Map(
    (enData.reciters as any[]).map((r: any) => [r.id, r]),
  );

  const allReciters: Reciter[] = (arData.reciters as any[])
    .filter(
      (r: any) =>
        r.moshaf &&
        r.moshaf.length > 0 &&
        r.moshaf[0].server,
    )
    .map((r: any) => {
      
      const enReciter = enMap.get(r.id);
      const moshaf = r.moshaf[0];
      const enMoshaf = enReciter?.moshaf?.[0];

      return {
        id: String(r.id),
        name: enReciter?.name || r.name,
        nameAr: r.name,
        style: enMoshaf?.name || moshaf?.name || '',
        server: moshaf.server.replace(/\/?$/, '/'),
      };
    });
  const reciters =
    FEATURED_RECITER_IDS.length > 0
      ? allReciters.filter((reciter) =>
          FEATURED_RECITER_IDS.includes(reciter.id),
        )
      : allReciters;

  recitersCache = {
    data: reciters,
    timestamp: Date.now(),
  };

  return reciters;
}

export function useQuranData() {
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadFlag, setReloadFlag] = useState(0);

  const surahs = useMemo<Surah[]>(() => getSurahList(), []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      // Never attempt a network request while offline: reciters are fetched
      // from the remote API only when online; surahs always come from the
      // bundled local dataset.
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (mounted) {
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);

        const recitersData = await fetchRecitersInternal();

        if (mounted) {
          setReciters(recitersData);
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