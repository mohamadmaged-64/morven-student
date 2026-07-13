/* eslint-disable @typescript-eslint/no-explicit-any */

declare module 'qrcode' {
  interface QRCodeOptions {
    width?: number;
    margin?: number;
    scale?: number;
    color?: { dark?: string; light?: string };
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' | string;
  }
  interface QRCodeToStringOptions extends QRCodeOptions {
    type?: 'svg' | 'terminal' | 'utf8';
  }
  function toDataURL(text: string, options?: QRCodeOptions): Promise<string>;
  function toCanvas(canvas: HTMLCanvasElement, text: string, options?: QRCodeOptions): Promise<void>;
  function toString(text: string, options?: QRCodeToStringOptions): Promise<string>;
  export { toDataURL, toCanvas, toString };
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  abort(): void;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}

interface HTMLVideoElement {
  captureStream?(frameRate?: number): MediaStream;
}
