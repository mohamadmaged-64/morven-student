import { useCallback, useEffect, useState } from 'react';
import { FileUpload, type FileUploadProps } from '@/components/UI/FileUpload';
import {
  ACCEPTED_AUDIO_EXTENSIONS,
  MAX_AUDIO_SIZE_MB,
} from '@/services/mediaApi';
import {
  ProcessingPanel,
  SelectedFileInfo,
  ToolBody,
  ToolSection,
  ToolTips,
  ResultCard,
  ErrorCard,
  OfflineNotice,
  downloadResult,
  formatBytes,
  useMediaProcessor,
  type ProgressState,
  type JobHandle,
} from '../VideoTools/shared';

export {
  SelectedFileInfo,
  ToolBody,
  ToolSection,
  ToolTips,
  ResultCard,
  ErrorCard,
  OfflineNotice,
  downloadResult,
  formatBytes,
};
export type { ProgressState, JobHandle };

type AudioUploadZoneProps = {
  label: string;
  description: string;
} & Pick<FileUploadProps, 'multiple' | 'maxFiles' | 'onFilesSelected'>;

/** Single dropzone pattern shared by every audio tool (click or drag-and-drop). */
export function AudioUploadZone({ label, description, multiple, maxFiles, onFilesSelected }: AudioUploadZoneProps) {
  return (
    <FileUpload
      accept={['audio/*', ...ACCEPTED_AUDIO_EXTENSIONS]}
      maxSize={MAX_AUDIO_SIZE_MB * 1024 * 1024}
      readFileData={false}
      hideFileList
      multiple={multiple}
      maxFiles={maxFiles}
      onFilesSelected={onFilesSelected}
      label={label}
      description={description}
    />
  );
}

const AUDIO_PHASE_LABELS: Record<ProgressState['phase'], string> = {
  uploading: 'جاري رفع الصوت إلى خادم المعالجة...',
  processing: 'جارٍ معالجة الصوت على الخادم...',
  downloading: 'جاري تنزيل الناتج...',
};

/** Processing panel with audio-specific phase wording. */
export function AudioProcessingPanel({ progress, onCancel }: { progress: ProgressState; onCancel: () => void }) {
  return <ProcessingPanel progress={progress} onCancel={onCancel} labels={AUDIO_PHASE_LABELS} />;
}

/** useMediaProcessor preset for audio tools (library category + error wording). */
export function useAudioProcessor() {
  return useMediaProcessor({ libraryCategory: 'audio-tools', errorKind: 'audio' });
}

/** Formats seconds as m:ss.t for display next to time inputs. */
export function formatTimecode(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds - mins * 60;
  return `${mins}:${secs.toFixed(1).padStart(4, '0')}`;
}

/** Live <audio> preview backed by an object URL; reports duration. */
export function AudioPreview({
  file,
  onDuration,
}: {
  file: File;
  onDuration?: (duration: number) => void;
}) {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const handleLoadedMetadata = useCallback(
    (e: React.SyntheticEvent<HTMLAudioElement>) => {
      const el = e.currentTarget;
      if (Number.isFinite(el.duration) && el.duration > 0) {
        onDuration?.(el.duration);
      }
    },
    [onDuration]
  );

  return (
    <div className="space-y-3">
      <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 p-3">
        {url && (
          <audio
            key={url}
            src={url}
            controls
            preload="metadata"
            className="w-full"
            onLoadedMetadata={handleLoadedMetadata}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2.5 py-0.5 text-xs font-medium">
          {formatBytes(file.size)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-0.5 text-xs font-medium">
          {file.type || 'نوع غير معروف'}
        </span>
      </div>
    </div>
  );
}
