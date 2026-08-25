import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpeechToTextTool from './audio/SpeechToTextTool';
import CutAudioTool from './audio/CutAudioTool';
import EnhanceAudioTool from './audio/EnhanceAudioTool';
import CleanAudioTool from './audio/CleanAudioTool';
import MergeAudioTool from './audio/MergeAudioTool';
import { MediaApiError } from '@/services/mediaApi';
import { saveToLibrary } from '@/services/savedFilesService';

vi.mock('@/services/mediaApi', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  transcribeAudioFile: vi.fn(),
  cutAudioFile: vi.fn(),
  enhanceAudioFile: vi.fn(),
  cleanAudioFile: vi.fn(),
  mergeAudioFiles: vi.fn(),
  cancelMediaJob: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/services/savedFilesService', () => ({
  saveToLibrary: vi.fn().mockResolvedValue(undefined),
}));

import {
  transcribeAudioFile,
  cutAudioFile,
  enhanceAudioFile,
  cleanAudioFile,
  mergeAudioFiles,
} from '@/services/mediaApi';

const mockedTranscribe = vi.mocked(transcribeAudioFile);
const mockedCut = vi.mocked(cutAudioFile);
const mockedEnhance = vi.mocked(enhanceAudioFile);
const mockedClean = vi.mocked(cleanAudioFile);
const mockedMerge = vi.mocked(mergeAudioFiles);
const mockedSaveToLibrary = vi.mocked(saveToLibrary);

function makeAudioFile(name = 'test.mp3', sizeBytes = 4096, type = 'audio/mpeg'): File {
  return new File([new ArrayBuffer(sizeBytes)], name, { type });
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
  const urlWithBlobs = URL as unknown as Record<string, unknown>;
  urlWithBlobs.createObjectURL =
    urlWithBlobs.createObjectURL ?? vi.fn(() => `blob:mock-${Math.random().toString(36).slice(2)}`);
  urlWithBlobs.revokeObjectURL = urlWithBlobs.revokeObjectURL ?? vi.fn();
});

afterEach(() => {
  cleanup();
});

describe('SpeechToTextTool', () => {
  it('shows upload zone and language selector, then transcribes the audio file', async () => {
    const user = userEvent.setup();
    mockedTranscribe.mockResolvedValue({
      blob: new Blob(['Hello world transcript']),
      filename: 'test-transcript.txt',
    });

    render(<SpeechToTextTool />);

    await selectFile(makeAudioFile());

    // File selected — language selector visible.
    expect(screen.getByText('لغة الصوت')).toBeInTheDocument();

    // Click transcribe button.
    await user.click(screen.getByRole('button', { name: 'بدء التفريغ' }));

    await waitFor(() => expect(mockedTranscribe).toHaveBeenCalledTimes(1));
    const [fileArg, langArg] = mockedTranscribe.mock.calls[0];
    expect(fileArg.name).toBe('test.mp3');
    expect(langArg).toBe('auto');

    expect(await screen.findByText('Hello world transcript')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'نسخ النص' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تنزيل TXT' })).toBeInTheDocument();
  });

  it('shows Arabic error when transcription fails with unsupported language', async () => {
    const user = userEvent.setup();
    mockedTranscribe.mockRejectedValue(
      new MediaApiError('INVALID_CONVERSION', 'Unsupported language. Allowed values: auto, ar, en.')
    );

    render(<SpeechToTextTool />);
    await selectFile(makeAudioFile());
    await user.click(screen.getByRole('button', { name: 'بدء التفريغ' }));

    expect(
      await screen.findByText('اللغة المحددة غير مدعومة. اختر لغة من القائمة.')
    ).toBeInTheDocument();
  });
});

describe('CutAudioTool', () => {
  it('validates start/end times and submits a cut request', async () => {
    const user = userEvent.setup();
    mockedCut.mockResolvedValue({
      blob: new Blob(['cut-audio-bytes']),
      filename: 'test-cut.mp3',
    });

    render(<CutAudioTool />);
    await selectFile(makeAudioFile());

    // Set valid start/end.
    const startInput = screen.getByLabelText('وقت البداية (ثانية)') as HTMLInputElement;
    const endInput = screen.getByLabelText('وقت النهاية (ثانية)') as HTMLInputElement;

    await user.type(startInput, '1');
    await user.type(endInput, '5');

    await user.click(screen.getByRole('button', { name: 'قص الصوت' }));

    await waitFor(() => expect(mockedCut).toHaveBeenCalledTimes(1));
    const [fileArg, optionsArg] = mockedCut.mock.calls[0];
    expect(fileArg.name).toBe('test.mp3');
    expect(optionsArg.start).toBe(1);
    expect(optionsArg.end).toBe(5);

    expect(await screen.findByText('تمت العملية بنجاح')).toBeInTheDocument();
  });

  it('disables the cut button when times are invalid', async () => {
    render(<CutAudioTool />);
    await selectFile(makeAudioFile());

    const startInput = screen.getByLabelText('وقت البداية (ثانية)') as HTMLInputElement;
    fireEvent.change(startInput, { target: { value: '10' } });

    // End before start = validation error.
    const endInput = screen.getByLabelText('وقت النهاية (ثانية)') as HTMLInputElement;
    fireEvent.change(endInput, { target: { value: '5' } });

    expect(screen.getByRole('button', { name: 'قص الصوت' })).toBeDisabled();
  });
});

describe('EnhanceAudioTool', () => {
  it('submits enhance with clarity and normalize options', async () => {
    const user = userEvent.setup();
    mockedEnhance.mockResolvedValue({
      blob: new Blob(['enhanced-bytes']),
      filename: 'test-enhanced.mp3',
    });

    render(<EnhanceAudioTool />);
    await selectFile(makeAudioFile());

    // Toggle normalize.
    await user.click(screen.getByText('تنعيم (Normalize)'));
    // Toggle clarity.
    await user.click(screen.getByText('وضوح الصوت (Clarity)'));

    await user.click(screen.getByRole('button', { name: 'تحسين الصوت' }));

    await waitFor(() => expect(mockedEnhance).toHaveBeenCalledTimes(1));
    const [, optionsArg] = mockedEnhance.mock.calls[0];
    expect(optionsArg.normalize).toBe(true);
    expect(optionsArg.clarity).toBe(true);

    expect(await screen.findByText('تمت العملية بنجاح')).toBeInTheDocument();
  });

  it('shows error when no adjustment is selected', async () => {
    render(<EnhanceAudioTool />);
    await selectFile(makeAudioFile());

    const btn = screen.getByRole('button', { name: 'تحسين الصوت' });
    expect(btn).toBeDisabled();
  });
});

describe('CleanAudioTool', () => {
  it('submits with the selected strength and archives under audio-tools', async () => {
    mockedClean.mockResolvedValue({
      blob: new Blob(['cleaned-audio']),
      filename: 'test-cleaned.mp3',
    });

    render(<CleanAudioTool />);
    await selectFile(makeAudioFile());

    // Select "strong" strength.
    fireEvent.click(screen.getByText('قوية'));

    // Trigger process by calling the handler via the button click (it uses internal state).
    const processBtn = screen.getByRole('button', { name: 'تنظيف الصوت' });
    fireEvent.click(processBtn);

    await waitFor(() => expect(mockedClean).toHaveBeenCalledTimes(1));
    const [, strengthArg] = mockedClean.mock.calls[0];
    expect(strengthArg).toBe('strong');

    expect(await screen.findByText('تمت العملية بنجاح')).toBeInTheDocument();
    expect(mockedSaveToLibrary).toHaveBeenCalledWith(
      expect.any(Blob),
      'test-cleaned.mp3',
      'audio-tools'
    );
  });
});

describe('MergeAudioTool', () => {
  it('disables the merge button when fewer than 2 files are selected', async () => {
    render(<MergeAudioTool />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    const file = makeAudioFile('clip1.mp3');
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);

    await waitFor(() => screen.getByText('clip1.mp3'));

    expect(screen.getByRole('button', { name: 'دمج الملفات الصوتية' })).toBeDisabled();
  });

  it('merges 2 audio files when enough are selected', async () => {
    mockedMerge.mockResolvedValue({
      blob: new Blob(['merged-bytes']),
      filename: 'merged-123.mp3',
    });

    render(<MergeAudioTool />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const file1 = makeAudioFile('clip1.mp3');
    const file2 = makeAudioFile('clip2.mp3');
    Object.defineProperty(input, 'files', { value: [file1, file2], configurable: true });
    fireEvent.change(input);

    await waitFor(() => screen.getByText('clip1.mp3'));
    expect(screen.getByText('clip2.mp3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'دمج الملفات الصوتية' }));

    await waitFor(() => expect(mockedMerge).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('تمت العملية بنجاح')).toBeInTheDocument();
  });
});
