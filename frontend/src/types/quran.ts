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
}
