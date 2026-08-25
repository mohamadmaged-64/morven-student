import { useEffect, useState } from 'react';
import { Button } from '@/components/UI/Button';
import {
  BG_TOLERANCE_DEFAULT,
  BG_TOLERANCE_MAX,
  BG_TOLERANCE_MIN,
  removeImageBackground,
} from '@/services/mediaApi';
import {
  CheckerboardBox,
  ImageProcessingPanel,
  ImageUploadZone,
  ResultCard,
  ErrorCard,
  SelectedFileInfo,
  ToolBody,
  ToolSection,
  ToolTips,
  downloadResult,
  useImageProcessor,
} from './shared';

/** إزالة الخلفية: flood-fill على الخادم مع شريط تسامح. */
export default function BgRemoveTool() {
  const { file, processing, progress, result, error, handleFile, clearFile, run, cancel, fullReset } =
    useImageProcessor();
  const [tolerance, setTolerance] = useState<number>(BG_TOLERANCE_DEFAULT);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    if (!result) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(result.blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [result]);

  const start = () =>
    run(async (onProgress, job) => removeImageBackground(file as File, tolerance, onProgress, job));

  return (
    <ToolBody>
      {!file && (
        <ImageUploadZone
          label="اسحب الصورة هنا أو انقر للاختيار"
          description="PNG أو JPG — تعمل الأداة أفضل ما يمكن مع خلفية بلون واحد موحّد"
          onFilesSelected={handleFile}
        />
      )}

      {file && !result && (
        <div className="space-y-4">
          <SelectedFileInfo file={file} onRemove={clearFile} />

          <ToolSection
            title="حساسية إزالة الخلفية (التسامح)"
            summary="القيم الأعلى تزيل ألوانًا قريبة من لون الخلفية، والقيم الأقل تحافظ على التفاصيل."
          >
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={BG_TOLERANCE_MIN}
                max={BG_TOLERANCE_MAX}
                step={1}
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
                className="flex-1 accent-primary-500"
                aria-label="قيمة التسامح"
              />
              <span className="text-sm font-bold text-primary-600 dark:text-primary-400 tabular-nums w-10 text-center">
                {tolerance}
              </span>
            </div>
          </ToolSection>

          {processing && progress ? (
            <ImageProcessingPanel progress={progress} onCancel={cancel} />
          ) : (
            <Button className="w-full" onClick={start}>
              إزالة الخلفية
            </Button>
          )}

          {error && <ErrorCard message={error} />}
        </div>
      )}

      {file && result && (
        <ResultCard
          result={result}
          extraInfo={
            previewUrl ? (
              <CheckerboardBox>
                <img src={previewUrl} alt="معاينة النتيجة بخلفية شفافة" className="max-h-[300px] mx-auto object-contain" />
              </CheckerboardBox>
            ) : undefined
          }
          onDownload={() => downloadResult(result)}
          onReset={fullReset}
        />
      )}

      <ToolTips
        items={[
          'تعمل الأداة بشكل مثالي مع الصور ذات الخلفية الموحدة (أبيض، رمادي، لون ثابت).',
          'زيادة التسامح تزيل الهالات حول الحواف لكنها قد تمس أجزاءً مشابهة للخلفية.',
          'يتم التنزيل بصيغة PNG للحفاظ على الشفافية.',
        ]}
      />
    </ToolBody>
  );
}
