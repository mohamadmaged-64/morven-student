import { create } from 'zustand';
import type { QuranDownloadInfo, Reciter, Surah } from '@/types/quran';
import {
  deleteDownloaded,
  getDownloadedBlob,
  getDownloadedMetaAll,
  putDownloaded,
} from '@/services/quranAudio';

let _audio: HTMLAudioElement | null = null;
let _objectUrl: string | null = null;
let _currentBlobKey: string | null = null;

function initAudio(): HTMLAudioElement {
  if (_audio) return _audio;

  _audio = new Audio();
  _audio.preload = 'metadata';

  _audio.addEventListener('timeupdate', () => {
    const store = useQuranStore.getState();
    if (_audio) {
      store._setCurrentTime(_audio.currentTime);
    }
  });

  _audio.addEventListener('loadedmetadata', () => {
    const store = useQuranStore.getState();
    if (_audio && isFinite(_audio.duration)) {
      store._setDuration(_audio.duration);
    }
  });

  _audio.addEventListener('ended', () => {
    useQuranStore.setState({ isPlaying: false });
  });

  _audio.addEventListener('play', () => {
    useQuranStore.setState({ isPlaying: true });
  });

  _audio.addEventListener('pause', () => {
    useQuranStore.setState({ isPlaying: false });
  });

  return _audio;
}

function revokeObjectUrl() {
  if (_objectUrl) {
    try {
      URL.revokeObjectURL(_objectUrl);
    } catch {
      // ignore
    }
    _objectUrl = null;
  }
  _currentBlobKey = null;
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine;
}

function getKey(reciter: Reciter, surah: Surah): string {
  return `${reciter.id}:${surah.id}`;
}

function makeDownloadInfo(
  reciter: Reciter,
  surah: Surah,
  status: QuranDownloadInfo['status'],
  progress: number | null,
  size: number,
): QuranDownloadInfo {
  return {
    key: getKey(reciter, surah),
    reciterId: reciter.id,
    reciterName: reciter.name,
    reciterNameAr: reciter.nameAr,
    surahId: surah.id,
    surahName: surah.name,
    surahNameAr: surah.nameAr,
    status,
    progress,
    size,
  };
}

interface QuranStore {
  currentReciter: Reciter | null;
  currentSurah: Surah | null;
  isPlaying: boolean;
  volume: number;
  duration: number;
  currentTime: number;
  audioUnavailable: boolean;
  downloads: Record<string, QuranDownloadInfo>;

  setReciter: (reciter: Reciter) => void;
  setSurah: (surah: Surah) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  getAudioUrl: () => string;

  download: (reciter: Reciter, surah: Surah) => void;
  cancelDownload: (key: string) => void;
  removeDownload: (key: string) => Promise<void>;
  hydrateDownloads: () => Promise<void>;

  _setCurrentTime: (time: number) => void;
  _setDuration: (duration: number) => void;
}

const activeDownloads = new Map<string, AbortController>();

export const useQuranStore = create<QuranStore>((set, get) => ({
  currentReciter: null,
  currentSurah: null,
  isPlaying: false,
  volume: 0.8,
  duration: 0,
  currentTime: 0,
  audioUnavailable: false,
  downloads: {},

  setReciter: (reciter) => {
    set({ currentReciter: reciter });

    if (get().currentSurah) {
      get().setSurah(get().currentSurah!);
    }
  },

  setSurah: (surah) => {
    const state = get();
    const wasPlaying = state.isPlaying;
    const audio = initAudio();
    const online = isOnline();
    const key = state.currentReciter
      ? getKey(state.currentReciter, surah)
      : '';
    const downloaded = key ? state.downloads[key]?.status === 'done' : false;

    revokeObjectUrl();
    set({
      currentSurah: surah,
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      audioUnavailable: false,
    });

    if (!state.currentReciter) return;

    if (downloaded) {
      audio.pause();
      if (wasPlaying) void get().play();
      return;
    }

    if (!online) {
      audio.pause();
      set({ audioUnavailable: true, isPlaying: false });
      return;
    }

    const audioUrl = `${state.currentReciter.server}${String(surah.id).padStart(3, '0')}.mp3`;
    audio.src = audioUrl;
    audio.load();

    if (wasPlaying) {
      void get().play();
    }
  },

  play: () => {
    const state = get();
    if (!state.currentSurah || !state.currentReciter) return;
    const audio = initAudio();
    const key = getKey(state.currentReciter, state.currentSurah);
    const downloaded = state.downloads[key]?.status === 'done';
    const online = isOnline();

    const remoteUrl = `${state.currentReciter.server}${String(state.currentSurah.id).padStart(3, '0')}.mp3`;

    if (downloaded) {
      void (async () => {
        try {
          // Reusing the already-assigned blob keeps the current position when
          // resuming or after a seek; only re-load when the src points to a
          // different/revoked URL (e.g. after switching surahs).
          if (
            _currentBlobKey === key &&
            audio.src &&
            audio.src.startsWith('blob:')
          ) {
            await audio.play();
            set({ audioUnavailable: false });
            return;
          }
          const blob = await getDownloadedBlob(key);
          if (!blob) throw new Error('Downloaded audio not found');
          revokeObjectUrl();
          _objectUrl = URL.createObjectURL(blob);
          _currentBlobKey = key;
          audio.src = _objectUrl;
          audio.load();
          await audio.play();
          set({ audioUnavailable: false });
        } catch {
          set({ audioUnavailable: true, isPlaying: false });
        }
      })();
      return;
    }

    if (!online) {
      set({ audioUnavailable: true, isPlaying: false });
      return;
    }

    try {
      revokeObjectUrl();
      if (!audio.src || !audio.src.startsWith('http')) {
        audio.src = remoteUrl;
        audio.load();
      }
      void audio.play().catch(() => {
        set({ audioUnavailable: true, isPlaying: false });
      });
      set({ audioUnavailable: false });
    } catch {
      set({ audioUnavailable: true, isPlaying: false });
    }
  },

  pause: () => {
    const audio = initAudio();
    audio.pause();
  },

  stop: () => {
    const audio = initAudio();
    audio.pause();
    audio.currentTime = 0;
    revokeObjectUrl();
    set({ currentTime: 0, isPlaying: false, audioUnavailable: false });
  },

  seek: (time) => {
    const audio = initAudio();
    audio.currentTime = time;
    set({ currentTime: time });
  },

  setVolume: (volume) => {
    const audio = initAudio();
    audio.volume = volume;
    set({ volume });
  },

  getAudioUrl: () => {
    const state = get();
    if (!state.currentReciter || !state.currentSurah) return '';
    return `${state.currentReciter.server}${String(state.currentSurah.id).padStart(3, '0')}.mp3`;
  },

  download: (reciter, surah) => {
    const state = get();
    const key = getKey(reciter, surah);
    const existing = state.downloads[key];
    if (existing && (existing.status === 'done' || existing.status === 'downloading')) {
      return;
    }

    if (!isOnline()) return;

    if (navigator.storage && typeof navigator.storage.persist === 'function') {
      void navigator.storage.persist().catch(() => {});
    }

    const controller = new AbortController();
    activeDownloads.set(key, controller);

    set({
      downloads: {
        ...state.downloads,
        [key]: makeDownloadInfo(reciter, surah, 'downloading', 0, 0),
      },
    });

    const url = `${reciter.server}${String(surah.id).padStart(3, '0')}.mp3`;

    void (async () => {
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const total = Number(res.headers.get('content-length')) || 0;
        const reader = res.body?.getReader();
        const chunks: (Uint8Array | Blob)[] = [];
        let received = 0;

        if (reader) {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
              received += value.length;
              set((s) => ({
                downloads: {
                  ...s.downloads,
                  [key]: {
                    ...s.downloads[key],
                    progress: total ? received / total : null,
                  },
                },
              }));
            }
          }
        } else {
          const blob = await res.blob();
          chunks.push(blob);
          received = blob.size;
        }

        const blob = new Blob(chunks as unknown as BlobPart[], { type: 'audio/mpeg' });
        const meta = {
          key,
          reciterId: reciter.id,
          reciterName: reciter.name,
          reciterNameAr: reciter.nameAr,
          surahId: surah.id,
          surahName: surah.name,
          surahNameAr: surah.nameAr,
          size: blob.size,
          date: Date.now(),
        };

        await putDownloaded(meta, blob);

        set((s) => ({
          downloads: {
            ...s.downloads,
            [key]: {
              ...s.downloads[key],
              status: 'done',
              progress: 100,
              size: blob.size,
            },
          },
        }));
      } catch (err) {
        const aborted = err instanceof DOMException && err.name === 'AbortError';
        if (aborted) {
          set((s) => {
            const next = { ...s.downloads };
            delete next[key];
            return { downloads: next };
          });
        } else {
          set((s) => ({
            downloads: {
              ...s.downloads,
              [key]: { ...s.downloads[key], status: 'error', progress: null },
            },
          }));
        }
      } finally {
        activeDownloads.delete(key);
      }
    })();
  },

  cancelDownload: (key) => {
    activeDownloads.get(key)?.abort();
  },

  removeDownload: async (key) => {
    await deleteDownloaded(key);

    set((s) => {
      const next = { ...s.downloads };
      delete next[key];
      return { downloads: next };
    });

    const state = get();
    if (
      state.currentReciter &&
      state.currentSurah &&
      key === getKey(state.currentReciter, state.currentSurah)
    ) {
      const audio = initAudio();
      audio.pause();
      revokeObjectUrl();
      audio.removeAttribute('src');
      audio.load();
      set({
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        audioUnavailable: !isOnline(),
      });
    }
  },

  hydrateDownloads: async () => {
    try {
      const list = await getDownloadedMetaAll();
      const map: Record<string, QuranDownloadInfo> = {};
      for (const m of list) {
        map[m.key] = {
          key: m.key,
          reciterId: m.reciterId,
          reciterName: m.reciterName,
          reciterNameAr: m.reciterNameAr,
          surahId: m.surahId,
          surahName: m.surahName,
          surahNameAr: m.surahNameAr,
          status: 'done',
          progress: 100,
          size: m.size,
        };
      }
      set({ downloads: map });
    } catch {
      // ignore hydration errors; downloads list stays empty
    }
  },

  _setCurrentTime: (time) => {
    set({ currentTime: time });
  },

  _setDuration: (duration) => {
    set({ duration });
  },
}));

if (typeof indexedDB !== 'undefined') {
  void useQuranStore.getState().hydrateDownloads();
}
