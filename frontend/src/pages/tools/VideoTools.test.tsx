import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExtractAudioFromVideo, CompressVideo, ConvertVideoFormats } from './VideoTools';
import { MediaApiError } from '@/services/mediaApi';
import { saveToLibrary } from '@/services/savedFilesService';

vi.mock('@/services/mediaApi', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  extractAudioFromVideo: vi.fn(),
  compressVideoFile: vi.fn(),
  convertVideoFile: vi.fn(),
  cancelMediaJob: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/services/savedFilesService', () => ({
  saveToLibrary: vi.fn().mockResolvedValue(undefined),
}));

import {
  extractAudioFromVideo,
  compressVideoFile,
} from '@/services/mediaApi';

const mockedExtract = vi.mocked(extractAudioFromVideo);
const mockedCompress = vi.mocked(compressVideoFile);
const mockedSaveToLibrary = vi.mocked(saveToLibrary);

function makeVideoFile(name = 'clip.mp4', sizeBytes = 1024): File {
  return new File([new ArrayBuffer(sizeBytes)], name, { type: 'video/mp4' });
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
});

afterEach(() => {
  cleanup();
});

describe('ExtractAudioFromVideo', () => {
  it('runs the extraction with default mp3/high options and shows the result', async () => {
    const user = userEvent.setup();
    mockedExtract.mockResolvedValue({
      blob: new Blob(['audio-bytes']),
      filename: 'clip-audio.mp3',
    });

    render(<ExtractAudioFromVideo />);
    await selectFile(makeVideoFile());

    await user.click(screen.getByRole('button', { name: 'استخراج الصوت' }));

    await waitFor(() => {
      expect(mockedExtract).toHaveBeenCalledTimes(1);
    });
    const [fileArg, optionsArg] = mockedExtract.mock.calls[0];
    expect(fileArg.name).toBe('clip.mp4');
    expect(optionsArg).toEqual({ format: 'mp3', quality: 'high' });

    expect(await screen.findByText('تمت العملية بنجاح')).toBeInTheDocument();
    expect(screen.getByText('clip-audio.mp3')).toBeInTheDocument();
    expect(mockedSaveToLibrary).toHaveBeenCalledWith(
      expect.any(Blob),
      'clip-audio.mp3',
      'video-tools'
    );
    // The action button is replaced by the result actions.
    expect(
      screen.queryByRole('button', { name: 'استخراج الصوت' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تنزيل الملف' })).toBeInTheDocument();
  });

  it('shows the Arabic mapped error when processing fails', async () => {
    const user = userEvent.setup();
    mockedExtract.mockRejectedValue(
      new MediaApiError('UNSUPPORTED_FILE_TYPE', 'unsupported')
    );

    render(<ExtractAudioFromVideo />);
    await selectFile(makeVideoFile());
    await user.click(screen.getByRole('button', { name: 'استخراج الصوت' }));

    expect(
      await screen.findByText('نوع الملف غير مدعوم. يرجى اختيار ملف فيديو صالح.')
    ).toBeInTheDocument();
    // Error state returns to the idle form so the user can retry.
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'استخراج الصوت' })
      ).toBeInTheDocument()
    );
  });

  it('hides the quality selector for lossless WAV', async () => {
    render(<ExtractAudioFromVideo />);
    await selectFile(makeVideoFile());

    const formatSelect = screen.getByLabelText('صيغة الصوت الناتج') as HTMLSelectElement;
    expect(formatSelect.value).toBe('mp3');
    expect(screen.getByLabelText('جودة الصوت')).toBeInTheDocument();

    fireEvent.change(formatSelect, { target: { value: 'wav' } });

    expect(await screen.findByLabelText('صيغة الصوت الناتج')).toHaveValue('wav');
    expect(screen.queryByLabelText('جودة الصوت')).not.toBeInTheDocument();
  });
});

describe('CompressVideo', () => {
  it('displays savings stats after a successful compression', async () => {
    const user = userEvent.setup();
    mockedCompress.mockResolvedValue({
      blob: new Blob([new ArrayBuffer(250)]),
      filename: 'clip-compressed.mp4',
    });

    render(<CompressVideo />);
    await selectFile(makeVideoFile('clip.mp4', 1000));

    await user.click(screen.getByRole('button', { name: 'ضغط الفيديو' }));

    expect(await screen.findByText('تمت العملية بنجاح')).toBeInTheDocument();
    // formatBytes keeps bytes under 1KB unsplit; "1000 B" appears both in
    // the file summary and in the savings grid.
    expect(screen.getAllByText('1000 B').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('250 B')).toBeInTheDocument(); // new size
    expect(screen.getByText('750 B')).toBeInTheDocument(); // saved
    expect(screen.getByText('75%')).toBeInTheDocument(); // reduction
  });

  it('warns instead of showing stats when nothing was saved', async () => {
    const user = userEvent.setup();
    mockedCompress.mockImplementation(async (file) => ({
      blob: new Blob([new ArrayBuffer(file.size)]),
      filename: 'same-size.mp4',
    }));

    render(<CompressVideo />);
    await selectFile(makeVideoFile('already-small.mp4', 500));
    await user.click(screen.getByRole('button', { name: 'ضغط الفيديو' }));

    expect(
      await screen.findByText(/لم يتم تقليل حجم هذا الملف/)
    ).toBeInTheDocument();
    expect(screen.queryByText('نسبة التقليل:')).not.toBeInTheDocument();
  });
});

describe('ConvertVideoFormats', () => {
  it('excludes the current format from conversion targets and converts', async () => {
    const { convertVideoFile } = await import('@/services/mediaApi');
    const mockedConvert = vi.mocked(convertVideoFile);
    mockedConvert.mockResolvedValue({
      blob: new Blob(['webm']),
      filename: 'clip-converted.webm',
    });
    const user = userEvent.setup();

    render(<ConvertVideoFormats />);
    await selectFile(makeVideoFile('clip.mp4'));

    // Current format card shows MP4.
    expect(screen.getByText('MP4')).toBeInTheDocument();

    const targetSelect = screen.getByLabelText('الصيغة المطلوبة') as HTMLSelectElement;
    const values = Array.from(targetSelect.options).map((o) => o.value);
    expect(values).not.toContain('mp4');
    expect(values).toEqual(expect.arrayContaining(['webm', 'mov', 'mkv']));

    await user.click(screen.getByRole('button', { name: 'تحويل إلى WEBM' }));
    await waitFor(() => expect(mockedConvert).toHaveBeenCalledTimes(1));
    const [, target] = mockedConvert.mock.calls[0];
    expect(target).toBe('webm');

    expect(await screen.findByText('تمت العملية بنجاح')).toBeInTheDocument();
  });

  it('auto-selects the first available target for unusual extensions', async () => {
    render(<ConvertVideoFormats />);
    await selectFile(makeVideoFile('recording.ts'));

    const targetSelect = screen.getByLabelText('الصيغة المطلوبة') as HTMLSelectElement;
    const values = Array.from(targetSelect.options).map((o) => o.value);
    expect(values.length).toBe(4); // ts is not a known target -> all offered
  });
});
