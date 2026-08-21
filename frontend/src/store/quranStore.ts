import { create } from 'zustand';
import type { Reciter, Surah } from '@/types/quran';

let _audio: HTMLAudioElement | null = null;

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

interface QuranStore {
  currentReciter: Reciter | null;
  currentSurah: Surah | null;
  isPlaying: boolean;
  volume: number;
  duration: number;
  currentTime: number;

  setReciter: (reciter: Reciter) => void;
  setSurah: (surah: Surah) => void;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;

  _setCurrentTime: (time: number) => void;
  _setDuration: (duration: number) => void;
}

export const useQuranStore = create<QuranStore>((set, get) => ({
  currentReciter: null,
  currentSurah: null,
  isPlaying: false,
  volume: 0.8,
  duration: 0,
  currentTime: 0,

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

    const server = state.currentReciter?.server || '';
    const audioUrl = `${server}${String(surah.id).padStart(3, '0')}.mp3`;

    set({ currentSurah: surah, currentTime: 0, duration: 0 });

    audio.src = audioUrl;
    audio.load();

    if (wasPlaying) {
      audio.play().catch(() => {});
    }
  },

  play: () => {
    const audio = initAudio();
    const state = get();

    if (!state.currentSurah || !state.currentReciter) return;

    if (!audio.src || audio.src === window.location.href || !audio.src.startsWith('http')) {
      const server = state.currentReciter.server;
      audio.src = `${server}${String(state.currentSurah.id).padStart(3, '0')}.mp3`;
      audio.load();
    }

    audio.play().catch(() => {});
  },

  pause: () => {
    const audio = initAudio();
    audio.pause();
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

  _setCurrentTime: (time) => {
    set({ currentTime: time });
  },

  _setDuration: (duration) => {
    set({ duration });
  },
}));
