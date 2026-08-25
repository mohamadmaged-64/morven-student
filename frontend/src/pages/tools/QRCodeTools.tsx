import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Input, TextArea, Select } from '@/components/UI/Input';
import { EmptyState } from '@/components/UI/EmptyState';
import { Badge } from '@/components/UI/Badge';
import { Slider } from '@/components/UI/Slider';
import { useAppStore } from '@/store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { saveToLibrary } from '@/services/savedFilesService';
import { QRImageScanner } from './QRImageScanner';
import { QRCodeCameraScanner } from './QRCodeCameraScanner';
type ToolId = 'qr-generator' | 'qr-scanner-image' | 'qr-scanner-camera';

type InputType = 'text' | 'url' | 'email' | 'phone' | 'wifi';
type ErrorLevel = 'L' | 'M' | 'Q' | 'H';
type OutputFormat = 'png' | 'svg';



function QRCodeGenerator() {
  const { addNotification } = useAppStore();
  const INPUT_TYPES = [
    { value: 'text', label: 'نص' },
    { value: 'url', label: 'رابط' },
    { value: 'email', label: 'بريد إلكتروني' },
    { value: 'phone', label: 'هاتف' },
    { value: 'wifi', label: 'واي فاي' },
  ];


  const SIZES = [
    { value: '128', label: '128px' },
    { value: '256', label: '256px' },
    { value: '512', label: '512px' },
    { value: '1024', label: '1024px' },
  ];
  const [inputType, setInputType] = useState<InputType>('text');
  const [textContent, setTextContent] = useState('');
  const [url, setUrl] = useState('https://');
  const [email, setEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [phone, setPhone] = useState('');
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiEncryption, setWifiEncryption] = useState('WPA');

  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [qrSize, setQrSize] = useState('512');
  const [errorLevel, setErrorLevel] = useState<ErrorLevel>('M');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('png');

  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrSvg, setQrSvg] = useState('');
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getQrContent = useCallback((): string => {
    switch (inputType) {
      case 'text': return textContent;
      case 'url': return url;
      case 'email': return `mailto:${email}${emailSubject ? `?subject=${encodeURIComponent(emailSubject)}` : ''}${emailBody ? `${emailSubject ? '&' : '?'}body=${encodeURIComponent(emailBody)}` : ''}`;
      case 'phone': return `tel:${phone}`;
      case 'wifi': return `WIFI:T:${wifiEncryption};S:${wifiSsid};P:${wifiPassword};;`;
      default: return textContent;
    }
  }, [inputType, textContent, url, email, emailSubject, emailBody, phone, wifiSsid, wifiPassword, wifiEncryption]);
  const handleGenerate = useCallback(async () => {
    const content = getQrContent();

    if (!content.trim()) {
      addNotification(
        'يرجى إدخال محتوى رمز QR',
        'warning'
      );
      return;
    }

    setGenerating(true);

    try {
      const size = parseInt(qrSize);

      const options = {
        width: size,
        margin: 2,
        color: {
          dark: fgColor,
          light: bgColor,
        },
        errorCorrectionLevel: errorLevel,
      };

      if (outputFormat === 'svg') {
        const svg = await QRCode.toString(content, {
          ...options,
          type: 'svg',
        });

        setQrSvg(svg);
        setQrDataUrl('');
      } else {
        const dataUrl = await QRCode.toDataURL(content, options);

        setQrDataUrl(dataUrl);
        setQrSvg('');
      }

      addNotification(
        'تم إنشاء رمز QR!',
        'success'
      );
    } catch {
      addNotification(
        'حدث خطأ أثناء إنشاء رمز QR',
        'error'
      );
    } finally {
      setGenerating(false);
    }
  }, [
    getQrContent,
    qrSize,
    fgColor,
    bgColor,
    errorLevel,
    outputFormat,
    addNotification,
  ]);

  useEffect(() => {
    if (qrDataUrl) handleGenerate();
  }, [qrSize, fgColor, bgColor, errorLevel, outputFormat]);

  const handleDownload = useCallback(() => {
    if (outputFormat === 'svg' && qrSvg) {
      const blob = new Blob([qrSvg], {
        type: 'image/svg+xml',
      });

      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'qrcode.svg';

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
      saveToLibrary(blob, 'qrcode.svg', 'qrcode-tools', 'image/svg+xml').catch(() => {});

      addNotification(
        'تم تنزيل SVG',
        'success'
      );
    } else if (qrDataUrl) {
      const a = document.createElement('a');

      a.href = qrDataUrl;
      a.download = 'qrcode.png';

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      fetch(qrDataUrl).then(r => r.blob()).then(blob => {
        saveToLibrary(blob, 'qrcode.png', 'qrcode-tools', 'image/png').catch(() => {});
      }).catch(() => {});

      addNotification(
        'تم تنزيل PNG',
        'success'
      );
    }
  }, [qrDataUrl, qrSvg, outputFormat, addNotification]);

  const handleCopyToClipboard = useCallback(async () => {
    if (!qrDataUrl) return;

    try {
      const res = await fetch(qrDataUrl);
      const blob = await res.blob();

      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);

      addNotification(
        'تم نسخ رمز QR إلى الحافظة',
        'success'
      );
    } catch {
      addNotification(
        'تعذر النسخ. جرّب التنزيل بدلاً من ذلك.'
        ,
        'error'
      );
    }
  }, [qrDataUrl, addNotification]);

  const content = getQrContent();
  const hasContent = content.trim().length > 0;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Select label="نوع الإدخال" options={INPUT_TYPES} value={inputType} onChange={(e) => setInputType(e.target.value as InputType)} />

          {inputType === 'text' && (
            <TextArea label="المحتوى النصي" value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="أدخل أي نص..." className="min-h-[120px]" />
          )}

          {inputType === 'url' && (
            <Input label="URL" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" />
          )}

          {inputType === 'email' && (
            <div className="space-y-3">
              <Input label="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني" />
              <Input label="الموضوع (اختياري)" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="موضوع البريد" />
              <TextArea label="النص (اختياري)" value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder="نص البريد..." className="min-h-[80px]" />
            </div>
          )}

          {inputType === 'phone' && (
            <Input label="رقم الهاتف" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 8900" />
          )}

          {inputType === 'wifi' && (
            <div className="space-y-3">
              <Input label="اسم الشبكة (SSID)" value={wifiSsid} onChange={(e) => setWifiSsid(e.target.value)} placeholder="MyWiFiNetwork" />
              <Input label="كلمة المرور" value={wifiPassword} onChange={(e) => setWifiPassword(e.target.value)} placeholder="كلمة المرور" type="password" />
              <Select label="التشفير" options={[{ value: 'WPA', label: 'WPA/WPA2' }, { value: 'WEP', label: 'WEP' }, { value: '', label: 'بدون' }]} value={wifiEncryption} onChange={(e) => setWifiEncryption(e.target.value)} />
            </div>
          )}

          <div className="border-t border-light-border dark:border-dark-border pt-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">التخصيص</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">لون الواجهة</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer" />
                  <Input value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">لون الخلفية</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer" />
                  <Input value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="flex-1" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="الحجم" options={SIZES} value={qrSize} onChange={(e) => setQrSize(e.target.value)} />
              <Select label="الصيغة" options={[{ value: 'png', label: 'PNG' }, { value: 'svg', label: 'SVG' }]} value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as OutputFormat)} />
            </div>
          </div>

          <Button onClick={handleGenerate} loading={generating} disabled={!hasContent} className="w-full" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>}>
            إنشاء رمز QR
          </Button>
        </div>

        <div className="space-y-4">
          <Card padding="lg" className="flex flex-col items-center justify-center min-h-[400px]">
            {!hasContent && !qrDataUrl && !qrSvg ? (
              <EmptyState
                icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>}
                title="معاينة رمز QR"
                description="أدخل المحتوى على اليسار واضغط إنشاء لإنشاء رمز QR الخاص بك."
              />
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
                {outputFormat === 'svg' && qrSvg ? (
                  <div className="p-4 bg-white rounded-xl shadow-card" dangerouslySetInnerHTML={{ __html: qrSvg }} style={{ width: parseInt(qrSize) / 2, height: parseInt(qrSize) / 2 }} />
                ) : qrDataUrl ? (
                  <img src={qrDataUrl} alt="رمز QR" className="rounded-xl shadow-card" style={{ maxWidth: '100%', height: 'auto' }} />
                ) : null}
                {hasContent && (
                  <Badge variant="primary">
                    {content.length} حرفًا
                  </Badge>
                )}
              </motion.div>
            )}
          </Card>

          {(qrDataUrl || qrSvg) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
              <Button onClick={handleDownload} variant="primary" className="flex-1" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}>
                تنزيل {outputFormat.toUpperCase()}
              </Button>
              {outputFormat === 'png' && (
                <Button onClick={handleCopyToClipboard} variant="secondary" className="flex-1" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}>
                  نسخ
                </Button>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function QRCodeToolPage({ toolId }: { toolId: string }) {
  const navigate = useNavigate();
  const configs: Record<ToolId, { title: string; description: string; icon: JSX.Element; component: JSX.Element }> = {
    'qr-generator': {
      title: 'مولّد رموز QR',
      description: 'أنشئ رموز QR مخصصة للنصوص والروابط والبريد وواي فاي والمزيد',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
      component: <QRCodeGenerator />,
    },
    'qr-scanner-image': {
      title: 'مسح رمز QR من صورة',
      description: 'ارفع صورة تحتوي على رمز QR وسنتعرف عليه فوراً',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
      component: <QRImageScanner />,
    },
    'qr-scanner-camera': {
      title: 'مسح رمز QR بالكاميرا',
      description: 'استخدم كاميرا جهازك لمسح رمز QR في الوقت الفعلي',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
      component: <QRCodeCameraScanner />,
    },
  };

  const config = configs[toolId as ToolId];

  if (!config) {
    return (
      <EmptyState
        icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
        title="الأداة غير موجودة"
        description="تعذر العثور على أداة رموز QR المطلوبة."
      />
    );
  }

    return (
      <div className="max-w-5xl mx-auto space-y-6" dir="rtl">
        <button
          onClick={() => navigate('/category/qrcode')}
          className="flex items-center gap-2 text-gray-500 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400 transition-colors mb-6 group"
        >
          <svg
            className="w-5 h-5 transition-transform rotate-180 group-hover:-translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>

          <span className="text-sm font-medium">
            العودة إلى أدوات رموز QR
          </span>
        </button>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <Card>{config.component}</Card>
      </motion.div>
    </div>
  );
}

export default QRCodeToolPage;
