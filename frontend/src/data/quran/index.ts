import type { Surah } from '@/types/quran';
import metaRaw from './quran-meta.json';

export interface SurahMeta {
  id: number;
  nameAr: string;
  nameEn: string;
  verses: number;
  revelation: string;
  juz: number[];
}

const META = metaRaw as SurahMeta[];

const DIACRITICS_RE = /[\u064B-\u065F\u0670\u0640]/g;
const HAMZA_ALEF_RE = /[\u0622\u0623\u0625\u0671]/g;

export function normalizeForSearch(value: string): string {
  return value
    .replace(DIACRITICS_RE, '')
    .replace(HAMZA_ALEF_RE, 'ا')
    .replace(/\u0649/g, 'ي')
    .replace(/\u0629/g, 'ه')
    .toLowerCase();
}

function toSurah(meta: SurahMeta): Surah {
  return {
    id: meta.id,
    name: meta.nameEn,
    nameAr: meta.nameAr,
    verses: meta.verses,
    juz: meta.juz,
  };
}

const surahList: Surah[] = META.map(toSurah);
const surahById = new Map<number, Surah>(surahList.map((s) => [s.id, s]));

export function getSurahList(): Surah[] {
  return surahList;
}

export function getSurahById(id: number): Surah | undefined {
  return surahById.get(id);
}

let textCache: Record<string, string[]> | null = null;

async function loadQuranText(): Promise<Record<string, string[]>> {
  if (textCache) return textCache;
  const mod = await import('./text');
  textCache = mod.QURAN_TEXT;
  return textCache;
}

export async function getSurahText(surahId: number): Promise<string[]> {
  const text = await loadQuranText();
  return text[String(surahId)] ?? [];
}

export async function getBasmala(): Promise<string> {
  const text = await loadQuranText();
  return text['1'][0] ?? '';
}

export interface QuranSearchResult {
  surahId: number;
  ayah: number;
  text: string;
  surahName: string;
  surahNameAr: string;
}

export async function searchQuran(
  query: string,
  limit = 20,
): Promise<QuranSearchResult[]> {
  const q = normalizeForSearch(query.trim());
  if (!q) return [];

  const text = await loadQuranText();
  const results: QuranSearchResult[] = [];

  for (const [sid, ayahs] of Object.entries(text)) {
    const id = Number(sid);
    const meta = surahById.get(id);
    for (let i = 0; i < ayahs.length; i++) {
      if (normalizeForSearch(ayahs[i]).includes(q)) {
        results.push({
          surahId: id,
          ayah: i + 1,
          text: ayahs[i],
          surahName: meta?.name ?? '',
          surahNameAr: meta?.nameAr ?? '',
        });
        if (results.length >= limit) return results;
      }
    }
  }

  return results;
}
