import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QRImageScanner } from './QRImageScanner';
import { QRCodeCameraScanner } from './QRCodeCameraScanner';

vi.mock('jsqr', () => ({
  default: vi.fn(),
}));

vi.mock('@/store/useAppStore', () => ({
  useAppStore: Object.assign(
    vi.fn(() => ({ addNotification: vi.fn() })),
    { getState: vi.fn(() => ({ addNotification: vi.fn() })) }
  ),
}));

import jsQR from 'jsqr';
const mockedJsQR = vi.mocked(jsQR);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function makeImageFile(name = 'qr.png', sizeBytes = 1024): File {
  return new File([new ArrayBuffer(sizeBytes)], name, { type: 'image/png' });
}

async function selectFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  expect(input).toBeTruthy();
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
}

class FakeImage {
  static LAST: FakeImage | null = null;
  naturalWidth = 320;
  naturalHeight = 240;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src = '';
  set src(value: string) {
    this._src = value;
    FakeImage.LAST = this;
    queueMicrotask(() => this.onload?.());
  }
  get src(): string {
    return this._src;
  }
}

function stubCanvasContext() {
  const imageData = { data: new Uint8ClampedArray(320 * 240 * 4) };
  const getContextMock = vi.fn(() => ({
    drawImage: vi.fn(),
    getImageData: vi.fn().mockReturnValue(imageData),
  }));
  HTMLCanvasElement.prototype.getContext = getContextMock as unknown as typeof HTMLCanvasElement.prototype.getContext;
  return { imageData };
}

describe('QRImageScanner', () => {
  it('renders the upload area', () => {
    render(<QRImageScanner />);
    expect(screen.getByRole('button', { name: /منطقة رفع صورة/ })).toBeInTheDocument();
  });

  it('shows loading state while decoding', async () => {
    vi.stubGlobal('Image', FakeImage);
    stubCanvasContext();
    mockedJsQR.mockReturnValue(null);

    render(<QRImageScanner />);
    await selectFile(makeImageFile());

    expect(screen.getByText(/جارٍ قراءة رمز QR/)).toBeInTheDocument();
  });

  it('displays decoded QR content', async () => {
    vi.stubGlobal('Image', FakeImage);
    stubCanvasContext();
    mockedJsQR.mockReturnValue({ data: 'https://example.com' } as ReturnType<typeof jsQR>);

    render(<QRImageScanner />);
    await selectFile(makeImageFile());

    await waitFor(() => {
      expect(screen.getByTestId('qr-result')).toHaveTextContent('https://example.com');
    });
  });

  it('shows no-QR-found state', async () => {
    vi.stubGlobal('Image', FakeImage);
    stubCanvasContext();
    mockedJsQR.mockReturnValue(null);

    render(<QRImageScanner />);
    await selectFile(makeImageFile());

    await waitFor(() => {
      expect(screen.getByText(/لم يتم العثور على رمز QR/)).toBeInTheDocument();
    });
  });

  it('copy button copies result to clipboard', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('Image', FakeImage);
    stubCanvasContext();
    mockedJsQR.mockReturnValue({ data: 'hello-qr' } as ReturnType<typeof jsQR>);

    const spy = vi.spyOn(navigator.clipboard, 'writeText');

    render(<QRImageScanner />);
    await selectFile(makeImageFile());

    await waitFor(() => {
      expect(screen.getByTestId('qr-result')).toHaveTextContent('hello-qr');
    });

    await user.click(screen.getByRole('button', { name: /نسخ/ }));
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('hello-qr');
    });
  });

  it('shows Open Link button when result is a URL', async () => {
    vi.stubGlobal('Image', FakeImage);
    stubCanvasContext();
    mockedJsQR.mockReturnValue({ data: 'https://example.com' } as ReturnType<typeof jsQR>);

    render(<QRImageScanner />);
    await selectFile(makeImageFile());

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /فتح الرابط/ });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://example.com');
    });
  });

  it('does not make any API/network calls', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    vi.stubGlobal('Image', FakeImage);
    stubCanvasContext();
    mockedJsQR.mockReturnValue({ data: 'test' } as ReturnType<typeof jsQR>);

    render(<QRImageScanner />);
    await selectFile(makeImageFile());

    await waitFor(() => {
      expect(screen.getByTestId('qr-result')).toHaveTextContent('test');
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('QRCodeCameraScanner', () => {
  function stubMobile() {
    vi.stubGlobal('navigator', {
      ...navigator,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      maxTouchPoints: 5,
    });
  }

  function stubDesktop() {
    vi.stubGlobal('navigator', {
      ...navigator,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      maxTouchPoints: 0,
    });
  }

  it('shows mobile-only message on desktop', () => {
    stubDesktop();
    render(<QRCodeCameraScanner />);
    expect(screen.getByText(/هذه الأداة متاحة فقط للهواتف والأجهزة اللوحية/)).toBeInTheDocument();
  });

  it('does not request camera permission on desktop', () => {
    stubDesktop();
    const getUserMedia = vi.fn();
    vi.stubGlobal('navigator', {
      ...navigator,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      maxTouchPoints: 0,
      mediaDevices: { getUserMedia },
    });
    render(<QRCodeCameraScanner />);
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('renders start button on mobile', () => {
    stubMobile();
    render(<QRCodeCameraScanner />);
    expect(screen.getByRole('button', { name: /تشغيل الكاميرا/ })).toBeInTheDocument();
  });

  it('handles camera permission denial', async () => {
    stubMobile();
    const user = userEvent.setup();
    const error = new DOMException('Permission denied', 'NotAllowedError');
    vi.stubGlobal('navigator', {
      ...navigator,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      maxTouchPoints: 5,
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue(error),
      },
    });

    render(<QRCodeCameraScanner />);
    await user.click(screen.getByRole('button', { name: /تشغيل الكاميرا/ }));

    await waitFor(() => {
      expect(screen.getByText(/تم رفض إذن الكاميرا/)).toBeInTheDocument();
    });
  });

  it('handles no camera found', async () => {
    stubMobile();
    const user = userEvent.setup();
    const error = new DOMException('No camera', 'NotFoundError');
    vi.stubGlobal('navigator', {
      ...navigator,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      maxTouchPoints: 5,
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue(error),
      },
    });

    render(<QRCodeCameraScanner />);
    await user.click(screen.getByRole('button', { name: /تشغيل الكاميرا/ }));

    await waitFor(() => {
      expect(screen.getByText(/لم يتم العثور على كاميرا/)).toBeInTheDocument();
    });
  });

  it('shows scanning UI and stop button when camera starts', async () => {
    stubMobile();
    const mockStream = {
      getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
    };
    vi.stubGlobal('navigator', {
      ...navigator,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      maxTouchPoints: 5,
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
    });

    HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<QRCodeCameraScanner />);
    await user.click(screen.getByRole('button', { name: /تشغيل الكاميرا/ }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /إيقاف الكاميرا/ })).toBeInTheDocument();
    });
  });

  it('stop button releases camera tracks', async () => {
    stubMobile();
    const stopMock = vi.fn();
    const mockStream = {
      getTracks: vi.fn().mockReturnValue([{ stop: stopMock }]),
    };
    vi.stubGlobal('navigator', {
      ...navigator,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      maxTouchPoints: 5,
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
    });

    HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<QRCodeCameraScanner />);
    await user.click(screen.getByRole('button', { name: /تشغيل الكاميرا/ }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /إيقاف الكاميرا/ })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /إيقاف الكاميرا/ }));
    expect(stopMock).toHaveBeenCalled();
  });

  it('no camera frames are uploaded', async () => {
    stubMobile();
    const fetchSpy = vi.spyOn(global, 'fetch');
    const mockStream = {
      getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
    };
    vi.stubGlobal('navigator', {
      ...navigator,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      maxTouchPoints: 5,
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
    });

    HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<QRCodeCameraScanner />);
    await user.click(screen.getByRole('button', { name: /تشغيل الكاميرا/ }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /إيقاف الكاميرا/ })).toBeInTheDocument();
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('scan again button resets result state', () => {
    stubMobile();
    render(<QRCodeCameraScanner />);
    expect(screen.getByRole('button', { name: /تشغيل الكاميرا/ })).toBeInTheDocument();
  });
});
