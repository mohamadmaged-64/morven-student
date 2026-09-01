import { useCallback, useEffect, useRef, useState } from 'react';

type ElemWithWebkit = HTMLDivElement & {
  webkitRequestFullscreen?: () => void;
};
type DocWithWebkit = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};

interface FullscreenControls {
  ref: React.RefObject<HTMLDivElement>;
  isFullscreen: boolean;
  enter: () => void;
  exit: () => void;
  toggle: () => void;
}

function getFullscreenElement(): Element | null {
  const doc = document as DocWithWebkit;
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function exitFullscreen(): void {
  const doc = document as DocWithWebkit;
  if (document.fullscreenElement || doc.webkitFullscreenElement) {
    if (document.exitFullscreen) void document.exitFullscreen();
    else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
  }
}

function requestFullscreen(el: ElemWithWebkit): void {
  if (el.requestFullscreen) void el.requestFullscreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
}

export function useFullscreen(): FullscreenControls {
  const ref = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => {
      const el = getFullscreenElement();
      setIsFullscreen(!!el && ref.current != null && el === ref.current);
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  const enter = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    requestFullscreen(el);
  }, []);

  const exit = useCallback(() => {
    exitFullscreen();
  }, []);

  const toggle = useCallback(() => {
    if (getFullscreenElement()) exitFullscreen();
    else {
      const el = ref.current;
      if (el) requestFullscreen(el);
    }
  }, []);

  return { ref, isFullscreen, enter, exit, toggle };
}
