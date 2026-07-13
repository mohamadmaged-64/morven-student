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

type ToolId = 'qr-generator';

type InputType = 'text' | 'url' | 'email' | 'phone' | 'wifi';
type ErrorLevel = 'L' | 'M' | 'Q' | 'H';
type OutputFormat = 'png' | 'svg';

const INPUT_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'wifi', label: 'WiFi' },
];

const ERROR_LEVELS = [
  { value: 'L', label: 'Low (7%)' },
  { value: 'M', label: 'Medium (15%)' },
  { value: 'Q', label: 'Quartile (25%)' },
  { value: 'H', label: 'High (30%)' },
];

const SIZES = [
  { value: '128', label: '128px' },
  { value: '256', label: '256px' },
  { value: '512', label: '512px' },
  { value: '1024', label: '1024px' },
];

function QRCodeGenerator() {
  const { addNotification } = useAppStore();
  const { direction } = useLanguageStore();

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
      addNotification('Please enter content for the QR code', 'warning');
      return;
    }
    setGenerating(true);
    try {
      const size = parseInt(qrSize);
      const options = {
        width: size,
        margin: 2,
        color: { dark: fgColor, light: bgColor },
        errorCorrectionLevel: errorLevel,
      };

      if (outputFormat === 'svg') {
        const svg = await QRCode.toString(content, { ...options, type: 'svg' });
        setQrSvg(svg);
        setQrDataUrl('');
      } else {
        const dataUrl = await QRCode.toDataURL(content, options);
        setQrDataUrl(dataUrl);
        setQrSvg('');
      }
      addNotification('QR code generated!', 'success');
    } catch {
      addNotification('Error generating QR code', 'error');
    } finally {
      setGenerating(false);
    }
  }, [getQrContent, qrSize, fgColor, bgColor, errorLevel, outputFormat, addNotification]);

  useEffect(() => {
    if (qrDataUrl) handleGenerate();
  }, [qrSize, fgColor, bgColor, errorLevel, outputFormat]);

  const handleDownload = useCallback(() => {
    if (outputFormat === 'svg' && qrSvg) {
      const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'qrcode.svg';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addNotification('SVG downloaded', 'success');
    } else if (qrDataUrl) {
      const a = document.createElement('a');
      a.href = qrDataUrl; a.download = 'qrcode.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      addNotification('PNG downloaded', 'success');
    }
  }, [qrDataUrl, qrSvg, outputFormat, addNotification]);

  const handleCopyToClipboard = useCallback(async () => {
    if (!qrDataUrl) return;
    try {
      const res = await fetch(qrDataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      addNotification('QR code copied to clipboard', 'success');
    } catch {
      addNotification('Failed to copy. Try downloading instead.', 'error');
    }
  }, [qrDataUrl, addNotification]);

  const content = getQrContent();
  const hasContent = content.trim().length > 0;

  return (
    <div className="space-y-6" dir={direction}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Select label="Input Type" options={INPUT_TYPES} value={inputType} onChange={(e) => setInputType(e.target.value as InputType)} />

          {inputType === 'text' && (
            <TextArea label="Text Content" value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Enter any text..." className="min-h-[120px]" />
          )}

          {inputType === 'url' && (
            <Input label="URL" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" />
          )}

          {inputType === 'email' && (
            <div className="space-y-3">
              <Input label="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
              <Input label="Subject (optional)" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Email subject" />
              <TextArea label="Body (optional)" value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder="Email body..." className="min-h-[80px]" />
            </div>
          )}

          {inputType === 'phone' && (
            <Input label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 8900" />
          )}

          {inputType === 'wifi' && (
            <div className="space-y-3">
              <Input label="Network Name (SSID)" value={wifiSsid} onChange={(e) => setWifiSsid(e.target.value)} placeholder="MyWiFiNetwork" />
              <Input label="Password" value={wifiPassword} onChange={(e) => setWifiPassword(e.target.value)} placeholder="Password" type="password" />
              <Select label="Encryption" options={[{ value: 'WPA', label: 'WPA/WPA2' }, { value: 'WEP', label: 'WEP' }, { value: '', label: 'None' }]} value={wifiEncryption} onChange={(e) => setWifiEncryption(e.target.value)} />
            </div>
          )}

          <div className="border-t border-light-border dark:border-dark-border pt-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Customization</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Foreground Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer" />
                  <Input value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Background Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer" />
                  <Input value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="flex-1" />
                </div>
              </div>
            </div>
            <Select label="Error Correction Level" options={ERROR_LEVELS} value={errorLevel} onChange={(e) => setErrorLevel(e.target.value as ErrorLevel)} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Size" options={SIZES} value={qrSize} onChange={(e) => setQrSize(e.target.value)} />
              <Select label="Format" options={[{ value: 'png', label: 'PNG' }, { value: 'svg', label: 'SVG' }]} value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as OutputFormat)} />
            </div>
          </div>

          <Button onClick={handleGenerate} loading={generating} disabled={!hasContent} className="w-full" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>}>
            Generate QR Code
          </Button>
        </div>

        <div className="space-y-4">
          <Card padding="lg" className="flex flex-col items-center justify-center min-h-[400px]">
            {!hasContent && !qrDataUrl && !qrSvg ? (
              <EmptyState
                icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>}
                title="QR Code Preview"
                description="Enter content on the left and click Generate to create your QR code."
              />
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
                {outputFormat === 'svg' && qrSvg ? (
                  <div className="p-4 bg-white rounded-xl shadow-card" dangerouslySetInnerHTML={{ __html: qrSvg }} style={{ width: parseInt(qrSize) / 2, height: parseInt(qrSize) / 2 }} />
                ) : qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="rounded-xl shadow-card" style={{ maxWidth: '100%', height: 'auto' }} />
                ) : null}
                {hasContent && (
                  <Badge variant="primary">{content.length} characters</Badge>
                )}
              </motion.div>
            )}
          </Card>

          {(qrDataUrl || qrSvg) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
              <Button onClick={handleDownload} variant="primary" className="flex-1" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}>
                Download {outputFormat.toUpperCase()}
              </Button>
              {outputFormat === 'png' && (
                <Button onClick={handleCopyToClipboard} variant="secondary" className="flex-1" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}>
                  Copy
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

  const configs: Record<ToolId, { title: string; description: string; icon: JSX.Element; component: JSX.Element }> = {
    'qr-generator': {
      title: 'QR Code Generator',
      description: 'Generate custom QR codes for text, URLs, emails, WiFi, and more',
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
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400">{config.icon}</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{config.title}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{config.description}</p>
            </div>
          </div>
        </Card>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <Card>{config.component}</Card>
      </motion.div>
    </div>
  );
}

export default QRCodeToolPage;
