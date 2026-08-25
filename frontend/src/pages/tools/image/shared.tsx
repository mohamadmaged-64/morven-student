import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/UI/Badge';
import { FileUpload, type FileUploadProps } from '@/components/UI/FileUpload';
import {
  ACCEPTED_IMAGE_EXTENSIONS,
  MAX_IMAGE_SIZE_MB,
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
} from '../video/shared';

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

type ImageUploadZoneProps = {
  label: string;
  description: string;
} & Pick<FileUploadProps, 'multiple' | 'maxFiles' | 'onFilesSelected'>;

/** Single dropzone pattern shared by every image tool (click or drag-and-drop). */
export function ImageUploadZone({ label, description, multiple, maxFiles, onFilesSelected }: ImageUploadZoneProps) {
  return (
    <FileUpload
      accept={['image/*', ...ACCEPTED_IMAGE_EXTENSIONS]}
      maxSize={MAX_IMAGE_SIZE_MB * 1024 * 1024}
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

const IMAGE_PHASE_LABELS: Record<ProgressState['phase'], string> = {
  uploading: 'جاري رفع الصورة إلى خادم المعالجة...',
  processing: 'جارٍ معالجة الصورة على الخادم...',
  downloading: 'جاري تنزيل الصورة الناتجة...',
};

/** Processing panel with image-specific phase wording. */
export function ImageProcessingPanel({ progress, onCancel }: { progress: ProgressState; onCancel: () => void }) {
  return <ProcessingPanel progress={progress} onCancel={onCancel} labels={IMAGE_PHASE_LABELS} />;
}

export interface ImageMeta {
  width: number;
  height: number;
}

/** Live <img> preview backed by an object URL; reports natural dimensions. */
export function ImagePreview({
  file,
  className = '',
  alt = 'معاينة الصورة',
  onMeta,
  imgRef,
}: {
  file: File;
  className?: string;
  alt?: string;
  onMeta?: (meta: ImageMeta) => void;
  imgRef?: React.RefObject<HTMLImageElement>;
}) {
  const [url, setUrl] = useState<string>('');
  const [meta, setMeta] = useState<ImageMeta | null>(null);

  const handleLoaded = useCallback(() => {
    const el = imgRef?.current;
    if (el && el.naturalWidth > 0) {
      const next = { width: el.naturalWidth, height: el.naturalHeight };
      setMeta(next);
      onMeta?.(next);
    }
  }, [imgRef, onMeta]);

  useEffect(() => {
    setMeta(null);
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        {url && (
          <img
            key={url}
            ref={imgRef}
            src={url}
            alt={alt}
            className={`max-w-full max-h-[400px] object-contain ${className}`}
            onLoad={handleLoaded}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="primary">{formatBytes(file.size)}</Badge>
        <Badge variant="secondary">{file.type || 'نوع غير معروف'}</Badge>
        {meta && (
          <Badge variant="info">
            {meta.width}×{meta.height}
          </Badge>
        )}
      </div>
    </div>
  );
}

/** useMediaProcessor preset for image tools (library category + error wording). */
export function useImageProcessor() {
  return useMediaProcessor({ libraryCategory: 'image-tools', errorKind: 'image' });
}

/** Checkerboard backdrop used to reveal transparency in PNG results. */
export function CheckerboardBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl overflow-hidden border border-light-border dark:border-dark-border"
      style={{
        backgroundImage:
          'linear-gradient(45deg, #d1d5db 25%, transparent 25%), linear-gradient(-45deg, #d1d5db 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d1d5db 75%), linear-gradient(-45deg, transparent 75%, #d1d5db 75%)',
        backgroundSize: '16px 16px',
        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
      }}
    >
      {children}
    </div>
  );
}
