export interface Reciter {
  id: string;
  name: string;
  nameAr: string;
  style: string;
  server: string;
}

export interface Surah {
  id: number;
  name: string;
  nameAr: string;
  verses?: number;
  juz?: number[];
}

export type QuranDownloadStatus = 'downloading' | 'done' | 'error';

export interface QuranDownloadInfo {
  key: string;
  reciterId: string;
  reciterName: string;
  reciterNameAr: string;
  surahId: number;
  surahName: string;
  surahNameAr: string;
  status: QuranDownloadStatus;
  progress: number | null;
  size: number;
}
