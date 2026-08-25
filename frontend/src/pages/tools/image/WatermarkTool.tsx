import { useEffect, useState } from 'react';
import { Button } from '@/components/UI/Button';
import {
  WATERMARK_POSITIONS,
  WATERMARK_TEXT_MAX_LENGTH,
  watermarkImageWithLogo,
  watermarkImageWithText,
  type WatermarkPosition,
} from '@/services/mediaApi';
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
  useImageProcessor,
} from './shared';

type Mode = 'text' | 'logo';

const POSITION_LABELS: Record<WatermarkPosition, string> = {
  'top-left': 'أعلى يسار',
  top: 'أعلى المنتصف',
  'top-right': 'أعلى يمين',
  left: 'يسار المنتصف',
  center: 'المنتصف',
  right: 'يمين المنتصف',
  'bottom-left': 'أسفل يسار',
  bottom: 'أسفل المنتصف',
  'bottom-right': 'أسفل يمين',
};

/** إضافة علامة مائية نصية أو شعار مع تحكم كامل بالموضع والحجم والشفافية. */
export default function WatermarkTool() {
  const { file, processing, progress, result, error, handleFile, clearFile, run, cancel, fullReset } =
    useImageProcessor();
  const [mode, setMode] = useState<Mode>('text');

  // Text options
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(8);
  const [opacity, setOpacity] = useState(80);
  const [color, setColor] = useState('#ffffff');
  const [position, setPosition] = useState<WatermarkPosition>('bottom-right');
  const [rotation, setRotation] = useState(0);

  // Logo options
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [sizePercent, setSizePercent] = useState(25);

  useEffect(() => {
    if (!logoFile) {
      setLogoUrl('');
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const textValid = mode === 'logo' || (text.trim().length > 0 && text.length <= WATERMARK_TEXT_MAX_LENGTH);
  const logoValid = mode === 'text' || logoFile !== null;

  const positionStyle = (size: string): React.CSSProperties => {
    const map: Record<WatermarkPosition, React.CSSProperties> = {
      'top-left': { top: '4%', left: '4%' },
      top: { top: '4%', left: '50%', transform: 'translateX(-50%)' },
      'top-right': { top: '4%', right: '4%' },
      left: { top: '50%', left: '4%', transform: 'translateY(-50%)' },
      center: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
      right: { top: '50%', right: '4%', transform: 'translateY(-50%)' },
      'bottom-left': { bottom: '4%', left: '4%' },
      bottom: { bottom: '4%', left: '50%', transform: 'translateX(-50%)' },
      'bottom-right': { bottom: '4%', right: '4%' },
    };
    return { position: 'absolute', fontSize: size, opacity: opacity / 100, color, ...map[position] };
  };

  const textPreviewStyle = (): React.CSSProperties => {
    const base = positionStyle('');
    return {
      position: 'absolute',
      fontWeight: 700,
      whiteSpace: 'nowrap',
      textShadow: '0 1px 3px rgba(0,0,0,.5)',
      opacity: opacity / 100,
      color,
      fontSize: `clamp(12px, ${fontSize * 0.16}rem, 42px)`,
      top: base.top,
      left: base.left,
      right: base.right,
      bottom: base.bottom,
      transform: `${base.transform ?? ''}${rotation ? ` rotate(${rotation}deg)` : ''}`,
    };
  };

  const start = () =>
    run(async (onProgress, job) => {
      if (mode === 'text') {
        return watermarkImageWithText(
          file as File,
          { text: text.trim(), fontSizePercent: fontSize, opacityPercent: opacity, color, position, rotationDeg: rotation },
          onProgress,
          job
        );
      }
      return watermarkImageWithLogo(
        file as File,
        { logoFile: logoFile as File, sizePercent, opacityPercent: opacity, position },
        onProgress,
        job
      );
    });

  return (
    <ToolBody>
      {!file && (
        <ImageUploadZone
          label="اسحب الصورة هنا أو انقر للاختيار"
          description="أضف نصًا أو شعارًا لحماية حقوق صورتك"
          onFilesSelected={handleFile}
        />
      )}

      {file && !result && (
        <div className="space-y-4">
          <SelectedFileInfo file={file} onRemove={clearFile} />

          <div className="flex gap-2">
            {(
              [
                ['text', 'نص'],
                ['logo', 'شعار / صورة'],
              ] as [Mode, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  mode === value
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'border-light-border dark:border-dark-border text-gray-600 dark:text-gray-300 hover:border-primary-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ToolSection title="معاينة التقريبية" summary="المعاينة توضح الموضع والشفافية — النتيجة النهائية تُرسم على الخادم بدقة كاملة.">
              <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center min-h-[220px]">
                {previewUrl && (
                  <>
                    <img src={previewUrl} alt="صورة العمل" className="max-w-full max-h-[300px] object-contain" draggable={false} />
                    {mode === 'text' && text.trim() && (
                      <span style={textPreviewStyle()}>{text}</span>
                    )}
                    {mode === 'logo' && logoUrl && (
                      <img
                        src={logoUrl}
                        alt="معاينة الشعار"
                        className="absolute w-1/4 object-contain drop-shadow"
                        style={{ ...positionStyle(''), width: `${sizePercent}%` }}
                        draggable={false}
                      />
                    )}
                  </>
                )}
              </div>
            </ToolSection>

            <ToolSection title={mode === 'text' ? 'خيارات النص' : 'خيارات الشعار'}>
              {mode === 'text' ? (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                      نص العلامة المائية (حتى {WATERMARK_TEXT_MAX_LENGTH} حرفًا)
                    </span>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value.slice(0, WATERMARK_TEXT_MAX_LENGTH))}
                      rows={2}
                      maxLength={WATERMARK_TEXT_MAX_LENGTH}
                      aria-label="نص العلامة المائية"
                      className="w-full rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-sm"
                      placeholder="مثال: © متجري 2026"
                    />
                    <span className="text-[11px] text-gray-400">{text.length}/{WATERMARK_TEXT_MAX_LENGTH}</span>
                  </label>

                  <SliderRow id="wm-size" label={`حجم الخط (${fontSize}% من أصغر ضلع)`} min={3} max={30} value={fontSize} onChange={setFontSize} />
                  <SliderRow id="wm-rotation" label={`دوران النص (${rotation}°)`} min={-90} max={90} value={rotation} onChange={setRotation} />

                  <div className="flex items-center gap-3">
                    <label htmlFor="wm-color" className="text-sm text-gray-700 dark:text-gray-300 shrink-0">
                      اللون
                    </label>
                    <input
                      id="wm-color"
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-12 h-9 rounded cursor-pointer bg-transparent"
                    />
                    <span dir="ltr" className="text-xs text-gray-500 uppercase tabular-nums">{color}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {!logoFile ? (
                    <ImageUploadZone
                      label="اختر صورة الشعار"
                      description="PNG شفاف يعطي أفضل نتيجة"
                      onFilesSelected={(files) => {
                        if (files.length > 0) setLogoFile(files[0].file);
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-light-border dark:border-dark-border px-3 py-2">
                      <span className="text-xs text-gray-600 dark:text-gray-300 truncate" dir="ltr">{logoFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setLogoFile(null)}
                        className="text-red-500 hover:text-red-600 font-bold shrink-0"
                        aria-label="إزالة الشعار واختيار آخر"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  <SliderRow id="wm-logo-size" label={`حجم الشعار (${sizePercent}% من عرض الصورة)`} min={5} max={50} value={sizePercent} onChange={setSizePercent} />
                </div>
              )}

              <div className="mt-3 space-y-3">
                <SliderRow id="wm-opacity" label={`الشفافية (${opacity}%)`} min={5} max={100} value={opacity} onChange={setOpacity} />

                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">الموضع</span>
                  <div className="grid grid-cols-3 gap-1 w-fit" role="group" aria-label="اختيار الموضع">
                    {WATERMARK_POSITIONS.map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setPosition(pos)}
                        aria-pressed={position === pos}
                        title={POSITION_LABELS[pos]}
                        className={`w-12 h-8 rounded-md border text-[10px] transition-colors ${
                          position === pos
                            ? 'bg-primary-500 text-white border-primary-500'
                            : 'border-light-border dark:border-dark-border text-gray-500 dark:text-gray-400 hover:border-primary-400'
                        }`}
                      >
                        {POSITION_LABELS[pos]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </ToolSection>
          </div>

          {processing && progress ? (
            <ImageProcessingPanel progress={progress} onCancel={cancel} />
          ) : (
            <Button className="w-full" onClick={start} disabled={!textValid || !logoValid}>
              إضافة العلامة المائية
            </Button>
          )}

          {!textValid && mode === 'text' && (
            <p className="text-xs text-amber-600 dark:text-amber-400">أدخل نص العلامة المائية أولًا.</p>
          )}
          {!logoValid && mode === 'logo' && (
            <p className="text-xs text-amber-600 dark:text-amber-400">اختر صورة الشعار أولًا.</p>
          )}

          {error && <ErrorCard message={error} />}
        </div>
      )}

      {file && result && (
        <ResultCard result={result} onDownload={() => downloadResult(result)} onReset={fullReset} />
      )}

      <ToolTips
        items={[
          'ضع العلامة المائية في زاوية بعيدة عن مركز الاهتمام كي لا تشوّه الصورة.',
          'الشفافية بين 60% و80% تحقق توازنًا جيدًا بين الحماية والجمال.',
          'يدعم النص العربي والإنجليزي معًا، ويتم رسمه بدقة عالية على الخادم.',
        ]}
      />
    </ToolBody>
  );
}

function SliderRow({ id, label, min, max, value, onChange }: {
  id: string;
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="text-sm text-gray-700 dark:text-gray-300 flex-1 min-w-0 truncate">
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-primary-500 max-w-[160px]"
      />
    </div>
  );
}
