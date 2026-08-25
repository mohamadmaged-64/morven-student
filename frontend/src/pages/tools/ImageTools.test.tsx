import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BgRemoveTool from './image/BgRemoveTool';
import ResizeTool from './image/ResizeTool';
import RotateTool from './image/RotateTool';
import WatermarkTool from './image/WatermarkTool';
import ImageInfoTool from './image/ImageInfoTool';
import HideRegionsTool from './image/HideRegionsTool';
import { MediaApiError } from '@/services/mediaApi';
import { saveToLibrary } from '@/services/savedFilesService';

vi.mock('@/services/mediaApi', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  removeImageBackground: vi.fn(),
  resizeImageFile: vi.fn(),
  rotateImageFile: vi.fn(),
  adjustImageFile: vi.fn(),
  hideImageRegions: vi.fn(),
  watermarkImageWithText: vi.fn(),
  watermarkImageWithLogo: vi.fn(),
  stripImageMetadata: vi.fn(),
  cancelMediaJob: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/services/savedFilesService', () => ({
  saveToLibrary: vi.fn().mockResolvedValue(undefined),
}));

import {
  removeImageBackground,
  resizeImageFile,
  rotateImageFile,
  watermarkImageWithText,
  stripImageMetadata,
} from '@/services/mediaApi';

const mockedRemoveBg = vi.mocked(removeImageBackground);
const mockedResize = vi.mocked(resizeImageFile);
const mockedRotate = vi.mocked(rotateImageFile);
const mockedWatermarkText = vi.mocked(watermarkImageWithText);
const mockedStrip = vi.mocked(stripImageMetadata);
const mockedSaveToLibrary = vi.mocked(saveToLibrary);

/** jsdom has no image decoder: fake Image fires onload with fixed dimensions. */
class FakeImage {
  static LAST: FakeImage | null = null;
  naturalWidth = 320;
  naturalHeight = 240;
  onload: (() => void) | null = null;
  private _src = '';
  set src(value: string) {
    this._src = value;
    queueMicrotask(() => this.onload?.());
  }
  get src(): string {
    return this._src;
  }
}

function makeImageFile(name = 'photo.jpg', sizeBytes = 2048): File {
  return new File([new ArrayBuffer(sizeBytes)], name, { type: 'image/jpeg' });
}

async function selectFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  expect(input).toBeTruthy();
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
  await screen.findByText('تم اختيار:');
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('Image', FakeImage);
  const urlWithBlobs = URL as unknown as Record<string, unknown>;
  urlWithBlobs.createObjectURL =
    urlWithBlobs.createObjectURL ?? vi.fn(() => `blob:mock-${Math.random().toString(36).slice(2)}`);
  urlWithBlobs.revokeObjectURL = urlWithBlobs.revokeObjectURL ?? vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

describe('BgRemoveTool', () => {
  it('runs background removal with the selected tolerance and archives under image-tools', async () => {
    const user = userEvent.setup();
    mockedRemoveBg.mockResolvedValue({
      blob: new Blob(['png-bytes']),
      filename: 'photo-no-bg.png',
    });

    render(<BgRemoveTool />);
    await selectFile(makeImageFile());

    // Default tolerance is 25.
    await user.click(screen.getByRole('button', { name: 'إزالة الخلفية' }));

    await waitFor(() => expect(mockedRemoveBg).toHaveBeenCalledTimes(1));
    const [fileArg, toleranceArg] = mockedRemoveBg.mock.calls[0];
    expect(fileArg.name).toBe('photo.jpg');
    expect(toleranceArg).toBe(25);

    expect(await screen.findByText('تمت العملية بنجاح')).toBeInTheDocument();
    expect(screen.getByText('photo-no-bg.png')).toBeInTheDocument();
    expect(mockedSaveToLibrary).toHaveBeenCalledWith(
      expect.any(Blob),
      'photo-no-bg.png',
      'image-tools'
    );
    expect(
      screen.queryByRole('button', { name: 'إزالة الخلفية' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تنزيل الملف' })).toBeInTheDocument();
  });

  it('shows the mapped Arabic error when no uniform background is detected', async () => {
    const user = userEvent.setup();
    mockedRemoveBg.mockRejectedValue(
      new MediaApiError(
        'INVALID_CONVERSION',
        'Could not detect a removable background in this image. Try increasing the tolerance.'
      )
    );

    render(<BgRemoveTool />);
    await selectFile(makeImageFile());
    await user.click(screen.getByRole('button', { name: 'إزالة الخلفية' }));

    expect(
      await screen.findByText(
        'لم يتم العثور على خلفية موحّدة قابلة للإزالة في هذه الصورة. جرّب زيادة قيمة التسامح أو استخدم صورة بخلفية بلون واحد.'
      )
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'إزالة الخلفية' })).toBeInTheDocument()
    );
  });
});

describe('ResizeTool', () => {
  it('auto-fills the locked ratio and submits both dimensions with the chosen fit', async () => {
    const user = userEvent.setup();
    mockedResize.mockResolvedValue({
      blob: new Blob(['resized']),
      filename: 'photo-resized.png',
    });

    render(<ResizeTool />);
    await selectFile(makeImageFile());

    // Wait until natural dimensions (320x240) were probed via FakeImage.
    await screen.findByText('أبعاد الصورة الحالية: 320×240');

    const widthInput = screen.getByLabelText('العرض') as HTMLInputElement;
    await user.type(widthInput, '320');
    await waitFor(() => {
      expect((screen.getByLabelText('الارتفاع') as HTMLInputElement).value).toBe('240');
    });

    fireEvent.change(screen.getByLabelText('طريقة الملاءمة'), {
      target: { value: 'cover' },
    });

    await user.click(screen.getByRole('button', { name: 'تغيير الحجم' }));

    await waitFor(() => expect(mockedResize).toHaveBeenCalledTimes(1));
    const [fileArg, optionsArg] = mockedResize.mock.calls[0];
    expect(fileArg.name).toBe('photo.jpg');
    expect(optionsArg).toEqual({ width: 320, height: 240, fit: 'cover', upscale: false });
    expect(await screen.findByText('تمت العملية بنجاح')).toBeInTheDocument();
  });

  it('keeps the action disabled until at least one dimension is provided', async () => {
    render(<ResizeTool />);
    await selectFile(makeImageFile());
    await screen.findByText('أبعاد الصورة الحالية: 320×240');

    expect(screen.getByRole('button', { name: 'تغيير الحجم' })).toBeDisabled();
    expect(mockedResize).not.toHaveBeenCalled();
  });
});

describe('RotateTool', () => {
  it('requires a rotation or flip before enabling the action, then submits both', async () => {
    const user = userEvent.setup();
    mockedRotate.mockResolvedValue({
      blob: new Blob(['rotated']),
      filename: 'photo-rotated.png',
    });

    render(<RotateTool />);
    await selectFile(makeImageFile());

    const idleLabel = 'اختر تدويرًا أو قلبًا واحدًا على الأقل';
    expect(screen.getByRole('button', { name: idleLabel })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '90°' }));
    await user.click(screen.getByRole('button', { name: '↕ قلب عمودي' }));

    await user.click(screen.getByRole('button', { name: 'تطبيق التعديلات' }));

    await waitFor(() => expect(mockedRotate).toHaveBeenCalledTimes(1));
    const [, optionsArg] = mockedRotate.mock.calls[0];
    expect(optionsArg).toEqual({ rotate: 90, flip: 'v' });
    expect(await screen.findByText('تمت العملية بنجاح')).toBeInTheDocument();
  });
});

describe('WatermarkTool', () => {
  it('submits the text watermark with position, color and opacity', async () => {
    const user = userEvent.setup();
    mockedWatermarkText.mockResolvedValue({
      blob: new Blob(['watermarked']),
      filename: 'photo-watermarked.png',
    });

    render(<WatermarkTool />);
    await selectFile(makeImageFile());

    const textarea = screen.getByLabelText(/نص العلامة المائية/);
    await user.type(textarea, '© متجري');

    await user.click(screen.getByRole('button', { name: 'أعلى يسار' }));
    await user.click(screen.getByRole('button', { name: 'إضافة العلامة المائية' }));

    await waitFor(() => expect(mockedWatermarkText).toHaveBeenCalledTimes(1));
    const [, optionsArg] = mockedWatermarkText.mock.calls[0];
    expect(optionsArg.text).toBe('© متجري');
    expect(optionsArg.position).toBe('top-left');
    expect(optionsArg.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(optionsArg.opacityPercent).toBe(80);
    expect(await screen.findByText('تمت العملية بنجاح')).toBeInTheDocument();
  });
});

describe('HideRegionsTool', () => {
  it('blocks submission until at least one region is drawn', async () => {
    render(<HideRegionsTool />);
    await selectFile(makeImageFile());

    expect(screen.getByRole('button', { name: 'إخفاء المناطق المحددة' })).toBeDisabled();
    expect(
      await screen.findByText(/ارسم منطقة واحدة على الأقل/)
    ).toBeInTheDocument();
  });
});

describe('ImageInfoTool', () => {
  it('shows locally decoded info and strips metadata through the API', async () => {
    const user = userEvent.setup();
    mockedStrip.mockResolvedValue({
      blob: new Blob(['clean-bytes']),
      filename: 'photo-clean.png',
    });

    render(<ImageInfoTool />);
    await selectFile(makeImageFile());

    expect(await screen.findByText('320×240')).toBeInTheDocument();
    expect(screen.getByText('0.08 MP')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'إزالة البيانات الوصفية (EXIF / GPS) والتنزيل' })
    );

    await waitFor(() => expect(mockedStrip).toHaveBeenCalledTimes(1));
    expect(mockedStrip.mock.calls[0][0].name).toBe('photo.jpg');
    expect(await screen.findByText('تمت العملية بنجاح')).toBeInTheDocument();
  });
});
