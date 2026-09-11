export interface Reciter {
  id: string;
  name: string;
  style: string;
  server: string;
}

export interface Surah {
  id: number;
  name: string;
  verses?: number;
}
