import { useState, useEffect, useCallback } from 'react';
import type { Reciter, Surah } from '@/types/quran';

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
let surahsCache: CacheEntry<Surah[]> | null = null;

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

async function fetchSurahsInternal(): Promise<Surah[]> {
  if (surahsCache && Date.now() - surahsCache.timestamp < CACHE_DURATION) {
    return surahsCache.data;
  }

  const [arRes, enRes] = await Promise.all([
    fetch('https://mp3quran.net/api/v3/suwar?language=ar'),
    fetch('https://mp3quran.net/api/v3/suwar?language=en'),
  ]);

  if (!arRes.ok || !enRes.ok) {
    throw new Error('Failed to fetch surahs');
  }

  const arData = await arRes.json();
  const enData = await enRes.json();

  const enMap = new Map(
    (enData.suwar as any[]).map((s: any) => [s.id, s]),
  );

  const surahs: Surah[] = (arData.suwar as any[]).map((s: any) => {
    const enSurah = enMap.get(s.id);

    return {
      id: s.id,
      name: (enSurah?.name || s.name).trim(),
      nameAr: s.name.trim(),
    };
  });

  surahsCache = {
    data: surahs,
    timestamp: Date.now(),
  };

  return surahs;
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