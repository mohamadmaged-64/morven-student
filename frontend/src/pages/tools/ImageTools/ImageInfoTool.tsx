import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/UI/Button';
import { Badge } from '@/components/UI/Badge';
import { Card } from '@/components/UI/Card';
import { stripImageMetadata } from '@/services/mediaApi';
import {
  ImageProcessingPanel,
  ImageUploadZone,
  ResultCard,
  ErrorCard,
  SelectedFileInfo,
  ToolBody,
  ToolSection,
  ToolTips,
  downloadResult,
  formatBytes,
  useImageProcessor,
} from './shared';

interface LocalImageInfo {
  width: number;
  height: number;
  megapixels: string;
  type: string;
  size: number;
  lastModified: string;
  hasExifMarker: boolean;
}

/** Byte-level scan for an EXIF APP1 marker ("Exif\0\0") in the first 128 KiB. */
function detectExifMarker(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 131072));
  const signature = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"
  outer: for (let i = 0; i <= bytes.length - signature.length; i++) {
    for (let j = 0; j < signature.length; j++) {
      if (bytes[i + j] !== signature[j]) continue outer;
    }
    return true;
  }
  return false;
}

/** معلومات الصورة والخصوصية: قراءة محلية للأبعاد وبيانات EXIF + إزالتها على الخادم. */
export default function ImageInfoTool() {
  const { file, processing, progress, result, error, handleFile, clearFile, run, cancel, fullReset } =
    useImageProcessor();
  const [info, setInfo] = useState<LocalImageInfo | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const analyze = useCallback(async (target: File) => {
    // Dimensions via decode.
    const dims = await new Promise<{ width: number; height: number }>((resolve) => {
      const url = URL.createObjectURL(target);
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });

    // EXIF presence via a bounded byte scan of the actual file header.
    let hasExifMarker = false;
    try {
      const head = await target.slice(0, 131072).arrayBuffer();
      hasExifMarker = detectExifMarker(head);
    } catch {
      hasExifMarker = false;
    }

    setInfo({
      width: dims.width,
      height: dims.height,
      megapixels: ((dims.width * dims.height) / 1_000_000).toFixed(2),
      type: target.type || 'غير معروف',
      size: target.size,
      lastModified: new Date(target.lastModified).toLocaleString('ar'),
      hasExifMarker,
    });
  }, []);

  useEffect(() => {
    setInfo(null);
    if (!file) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    void analyze(file);
  }, [file, analyze]);

  const startStrip = () =>
    run(async (onProgress, job) => stripImageMetadata(file as File, onProgress, job));

  return (
    <ToolBody>
      {!file && (
        <ImageUploadZone
          label="اسحب الصورة هنا أو انقر للاختيار"
          description="اعرض الأبعاد والبيانات الوصفية وأزل بيانات الموقع قبل المشاركة"
          onFilesSelected={handleFile}
        />
      )}

      {file && !result && (
        <div className="space-y-4">
          <SelectedFileInfo file={file} onRemove={clearFile} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ToolSection title="الصورة">
              <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center min-h-[200px]">
                {previewUrl && (
                  <img src={previewUrl} alt="معاينة الصورة" className="max-w-full max-h-[280px] object-contain" draggable={false} />
                )}
              </div>
            </ToolSection>

            <ToolSection title="المعلومات" summary={info ? undefined : 'جارٍ تحليل الصورة...'}>
              {info && (
                <>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    <dt className="text-gray-500 dark:text-gray-400">الأبعاد</dt>
                    <dd className="font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
                      {info.width > 0 ? `${info.width}×${info.height}` : 'تعذر القراءة'}
                    </dd>
                    <dt className="text-gray-500 dark:text-gray-400">الدقة</dt>
                    <dd className="font-semibold text-gray-800 dark:text-gray-200 tabular-nums">{info.megapixels} MP</dd>
                    <dt className="text-gray-500 dark:text-gray-400">الحجم</dt>
                    <dd className="font-semibold text-gray-800 dark:text-gray-200">{formatBytes(info.size)}</dd>
                    <dt className="text-gray-500 dark:text-gray-400">النوع</dt>
                    <dd className="font-semibold text-gray-800 dark:text-gray-200" dir="ltr">{info.type}</dd>
                    <dt className="text-gray-500 dark:text-gray-400">آخر تعديل</dt>
                    <dd className="font-semibold text-gray-800 dark:text-gray-200">{info.lastModified}</dd>
                  </dl>

                  <div className="mt-4">
                    {info.hasExifMarker ? (
                      <Card padding="sm" className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                        <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                          ⚠ تحتوي هذه الصورة على بيانات وصفية (EXIF) قد تشمل إحداثيات موقعك وتاريخ التصوير وطراز الكاميرا.
                        </p>
                      </Card>
                    ) : (
                      <Badge variant="success">لا توجد بيانات EXIF ظاهرة في ترويسة الملف</Badge>
                    )}
                  </div>
                </>
              )}
            </ToolSection>
          </div>

          {processing && progress ? (
            <ImageProcessingPanel progress={progress} onCancel={cancel} />
          ) : (
            info && (
              <Button className="w-full" onClick={startStrip}>
                إزالة البيانات الوصفية (EXIF / GPS) والتنزيل
              </Button>
            )
          )}

          {error && <ErrorCard message={error} />}
        </div>
      )}

      {file && result && (
        <ResultCard
          result={result}
          extraInfo={
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              تمت إزالة بيانات EXIF/GPS بالكامل. الحجم بعد التنظيف: {formatBytes(result.blob.size)}
            </p>
          }
          onDownload={() => downloadResult(result)}
          onReset={fullReset}
        />
      )}

      <ToolTips
        items={[
          'إزالة البيانات الوصفية خطوة مهمة قبل نشر صور الهاتف على الإنترنت.',
          'تُقرأ الأبعاد والحجم محليًا في متصفحك دون رفع الصورة.',
          'زر الإزالة يرفع الصورة إلى الخادم ويعيد نسخة نظيفة تمامًا من أي بيانات موقع.',
        ]}
      />
    </ToolBody>
  );
}
