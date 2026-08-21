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
import { useLanguageStore } from '@/store/useLanguageStore';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { saveToLibrary } from '@/services/savedFilesService';
type ToolId = 'qr-generator';

type InputType = 'text' | 'url' | 'email' | 'phone' | 'wifi';
type ErrorLevel = 'L' | 'M' | 'Q' | 'H';
type OutputFormat = 'png' | 'svg';



function QRCodeGenerator() {
  const { addNotification } = useAppStore();
  const { direction } = useLanguageStore();
  const { t } = useTranslation();
  const INPUT_TYPES = [
  { value: 'text', label: t('qr.inputTypes.text', 'Text') },
  { value: 'url', label: t('qr.inputTypes.url', 'URL') },
  { value: 'email', label: t('qr.inputTypes.email', 'Email') },
  { value: 'phone', label: t('qr.inputTypes.phone', 'Phone') },
  { value: 'wifi', label: t('qr.inputTypes.wifi', 'WiFi') },
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
      t('qr.notifications.enterContent', 'Please enter content for the QR code'),
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
      t('qr.notifications.generated', 'QR code generated!'),
      'success'
    );
  } catch {
    addNotification(
      t('qr.notifications.generateError', 'Error generating QR code'),
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
  t,
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
      t('qr.notifications.svgDownloaded', 'SVG downloaded'),
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
      t('qr.notifications.pngDownloaded', 'PNG downloaded'),
      'success'
    );
  }
}, [qrDataUrl, qrSvg, outputFormat, addNotification, t]);

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
      t('qr.notifications.copied', 'QR code copied to clipboard'),
      'success'
    );
  } catch {
    addNotification(
      t(
        'qr.notifications.copyFailed',
        'Failed to copy. Try downloading instead.'
      ),
      'error'
    );
  }
}, [qrDataUrl, addNotification, t]);

  const content = getQrContent();
  const hasContent = content.trim().length > 0;

  return (
    <div className="space-y-6" dir={direction}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Select label={t('qr.inputType', 'Input Type')} options={INPUT_TYPES} value={inputType} onChange={(e) => setInputType(e.target.value as InputType)} />

          {inputType === 'text' && (
            <TextArea label={t('qr.textContent', 'Text Content')} value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder={t('qr.enterText', 'Enter any text...')} className="min-h-[120px]" />
          )}

          {inputType === 'url' && (
            <Input label="URL" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" />
          )}

          {inputType === 'email' && (
            <div className="space-y-3">
              <Input label={t('qr.emailAddress', 'Email Address')} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('qr.emailAddressPlaceholder', 'Email Address ')} />
              <Input label={t('qr.emailSubject', 'Subject (optional)')} value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder={t('qr.emailSubjectPlaceholder', 'Email subject')} />
              <TextArea label={t('qr.emailBody', 'Body (optional)')} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder={t('qr.emailBodyPlaceholder', 'Email body...')} className="min-h-[80px]" />
            </div>
          )}

          {inputType === 'phone' && (
            <Input label={t('qr.phoneNumber', 'Phone Number')} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 8900" />
          )}

          {inputType === 'wifi' && (
            <div className="space-y-3">
              <Input label={t('qr.networkName', 'Network Name (SSID)')} value={wifiSsid} onChange={(e) => setWifiSsid(e.target.value)} placeholder="MyWiFiNetwork" />
              <Input label={t('qr.password', 'Password')} value={wifiPassword} onChange={(e) => setWifiPassword(e.target.value)} placeholder={t('qr.password', 'Password')} type="password" />
              <Select label={t('qr.encryption', 'Encryption')} options={[{ value: 'WPA', label: t('qr.wpa', 'WPA/WPA2') }, { value: 'WEP', label: t('qr.wep', 'WEP') }, { value: '', label: t('qr.none', 'None') }]} value={wifiEncryption} onChange={(e) => setWifiEncryption(e.target.value)} />
            </div>
          )}

          <div className="border-t border-light-border dark:border-dark-border pt-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('qr.customization', 'Customization')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('qr.foregroundColor', 'Foreground Color')}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer" />
                  <Input value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('qr.backgroundColor', 'Background Color')}</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer" />
                  <Input value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="flex-1" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label={t('qr.size', 'Size')} options={SIZES} value={qrSize} onChange={(e) => setQrSize(e.target.value)} />
              <Select label={t('qr.format', 'Format')} options={[{ value: 'png', label: 'PNG' }, { value: 'svg', label: 'SVG' }]} value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as OutputFormat)} />
            </div>
          </div>

          <Button onClick={handleGenerate} loading={generating} disabled={!hasContent} className="w-full" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>}>
            {t('qr.generate', 'Generate QR Code')}
          </Button>
        </div>

        <div className="space-y-4">
          <Card padding="lg" className="flex flex-col items-center justify-center min-h-[400px]">
            {!hasContent && !qrDataUrl && !qrSvg ? (
              <EmptyState
                icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>}
                title={t('qr.preview', 'QR Code Preview')}
                description={t(
                 'qr.previewDescription',
                 'Enter content on the left and click Generate to create your QR code.'
              )}
                />
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
                {outputFormat === 'svg' && qrSvg ? (
                  <div className="p-4 bg-white rounded-xl shadow-card" dangerouslySetInnerHTML={{ __html: qrSvg }} style={{ width: parseInt(qrSize) / 2, height: parseInt(qrSize) / 2 }} />
                ) : qrDataUrl ? (
                  <img src={qrDataUrl} alt={t('qr.alt', 'QR Code')} className="rounded-xl shadow-card" style={{ maxWidth: '100%', height: 'auto' }} />
                ) : null}
                {hasContent && (
                 <Badge variant="primary"> 
                 {content.length} {t('qr.characters', 'characters')}
                  </Badge>
                )}
              </motion.div>
            )}
          </Card>

          {(qrDataUrl || qrSvg) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
              <Button onClick={handleDownload} variant="primary" className="flex-1" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}>
                {t('qr.download', 'Download')} {outputFormat.toUpperCase()} {outputFormat.toUpperCase()}
              </Button>
              {outputFormat === 'png' && (
                <Button onClick={handleCopyToClipboard} variant="secondary" className="flex-1" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}>
                  {t('qr.copy', 'Copy')}
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
  const { direction } = useLanguageStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const configs: Record<ToolId, { title: string; description: string; icon: JSX.Element; component: JSX.Element }> = {
    'qr-generator': {
     title: t('qr.title', 'QR Code Generator'),
     description: t(
        'qr.description',
        'Generate custom QR codes for text, URLs, emails, WiFi, and more'
    ),
     icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
      component: <QRCodeGenerator />,
    },
  };

  const config = configs[toolId as ToolId];

  if (!config) {
    return (
      <EmptyState
        icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
       title="Tool not found"
       description="The requested QR code tool could not be found."
       />
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6" dir={direction}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card>
          <button
            onClick={() => navigate('/category/qrcode')}
            className="flex items-center gap-2 text-gray-500 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400 transition-colors mb-6 group"
          >
            <svg
              className={`w-5 h-5 transition-transform ${
                direction === 'rtl'
                  ? 'rotate-180 group-hover:translate-x-1'
                  : 'group-hover:-translate-x-1'
              }`}
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
              {direction === 'rtl'
                ? 'العودة لأدوات QR Codes'
                : 'Back to QR Code Tools'}
            </span>
          </button>
        
        </Card>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <Card>{config.component}</Card>
      </motion.div>
    </div>
  );
}

export default QRCodeToolPage;
