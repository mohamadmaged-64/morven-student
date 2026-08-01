import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getToolById } from '@/data/tools';
import {
  Button,
  Card,
  Input,
  TextArea,
  Select,
  Badge,
  EmptyState,
  Slider,
} from '@/components/UI';
import { ToolLayout } from '@/components/Tool/ToolLayout';
import { ToolHero } from '@/components/Tool/ToolHero';
import { useAppStore } from '@/store/useAppStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import QRCode from 'qrcode';

// =============================================================================
// Shared helpers
// =============================================================================

function ResultBox({
  title,
  value,
  placeholder,
  mono = true,
  onClear,
}: {
  title: string;
  value: string;
  placeholder?: string;
  mono?: boolean;
  onClear?: () => void;
}) {
  const { t } = useTranslation();
  const { addNotification } = useAppStore();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      addNotification(t('Copied to clipboard', 'Copied to clipboard'), 'success');
    } catch {
      addNotification(t('Copy failed', 'Copy failed'), 'error');
    }
  };

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
        <div className="flex items-center gap-2">
          {value && (
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              {t('Copy', 'Copy')}
            </Button>
          )}
          {onClear && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              {t('Clear', 'Clear')}
            </Button>
          )}
        </div>
      </div>
      <pre
        dir="ltr"
        className={`w-full min-h-[100px] max-h-80 overflow-auto rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border p-4 text-sm ${
          mono ? 'font-mono' : ''
        } text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words`}
      >
        {value || placeholder || t('Result placeholder', 'Result placeholder')}
      </pre>
    </Card>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{children}</span>
  );
}

// =============================================================================
// 1. JSON FORMATTER
// =============================================================================

function JsonFormatter() {
  const { t } = useTranslation();
  const { addNotification } = useAppStore();
  const [input, setInput] = useState('{\n  "name": "Morven",\n  "version": 1\n}');
  const [indent, setIndent] = useState('2');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(input);
      const size = parseInt(indent, 10);
      setOutput(JSON.stringify(parsed, null, size));
      setError('');
      addNotification(t('JSON formatted successfully', 'JSON formatted successfully'), 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setOutput('');
      addNotification(t('Invalid JSON', 'Invalid JSON'), 'error');
    }
  };

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <TextArea
          label={t('Input JSON', 'Input JSON')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={8}
          className="font-mono"
          placeholder='{ "key": "value" }'
        />
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label={t('Indentation', 'Indentation')}
            options={[
              { value: '2', label: '2 ' + t('spaces', 'spaces') },
              { value: '4', label: '4 ' + t('spaces', 'spaces') },
              { value: '0', label: t('Minified', 'Minified') },
            ]}
            value={indent}
            onChange={(e) => setIndent(e.target.value)}
            wrapperClassName="sm:w-44"
          />
          <Button onClick={handleFormat} className="flex-1 sm:flex-none">
            {t('Format', 'Format')}
          </Button>
        </div>
        {error && (
          <p className="text-sm text-red-500" dir="ltr">
            {error}
          </p>
        )}
      </Card>
      <ResultBox
        title={t('Formatted JSON', 'Formatted JSON')}
        value={output}
        onClear={() => setOutput('')}
      />
    </div>
  );
}

// =============================================================================
// 2. JSON VALIDATOR
// =============================================================================

function JsonValidator() {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [result, setResult] = useState<'valid' | 'invalid' | null>(null);
  const [message, setMessage] = useState('');

  const handleValidate = () => {
    try {
      JSON.parse(input);
      setResult('valid');
      setMessage(t('Valid JSON', 'Valid JSON'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setResult('invalid');
      setMessage(msg);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <TextArea
          label={t('Input JSON', 'Input JSON')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={10}
          className="font-mono"
          placeholder='{ "key": "value" }'
        />
        <Button onClick={handleValidate} disabled={!input.trim()}>
          {t('Validate', 'Validate')}
        </Button>
      </Card>
      {result && (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card
              className={`border-2 ${
                result === 'valid'
                  ? 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-900/10'
                  : 'border-red-500/40 bg-red-50 dark:bg-red-900/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{result === 'valid' ? '✅' : '❌'}</span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`font-semibold ${
                      result === 'valid' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
                    }`}
                  >
                    {result === 'valid' ? t('Valid JSON', 'Valid JSON') : t('Invalid JSON', 'Invalid JSON')}
                  </p>
                  {result === 'invalid' && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 break-words" dir="ltr">
                      {message}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// =============================================================================
// 3. REGEX TESTER
// =============================================================================

function RegexTester() {
  const { t } = useTranslation();
  const [pattern, setPattern] = useState('\\b\\w+\\b');
  const [flags, setFlags] = useState('gi');
  const [text, setText] = useState('The quick brown fox jumps over the lazy dog.');
  const [matches, setMatches] = useState<string[]>([]);
  const [error, setError] = useState('');

  const handleTest = () => {
    try {
      const regex = new RegExp(pattern, flags);
      setMatches(text.match(regex) ?? []);
      setError('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setMatches([]);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('Regular Expression', 'Regular Expression')}
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="font-mono"
            dir="ltr"
            placeholder="\d+"
          />
          <Input
            label={t('Flags', 'Flags')}
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
            className="font-mono"
            dir="ltr"
            placeholder="gi"
          />
        </div>
        <TextArea
          label={t('Test text', 'Test text')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
        />
        <div className="flex items-center gap-3">
          <Button onClick={handleTest}>{t('Test', 'Test')}</Button>
          {matches.length > 0 && (
            <Badge variant="success">
              {t('Match count', 'Match count')}: {matches.length}
            </Badge>
          )}
        </div>
        {error && (
          <p className="text-sm text-red-500" dir="ltr">
            {error}
          </p>
        )}
      </Card>
      {matches.length > 0 && (
        <Card className="space-y-3">
          <FieldLabel>{t('Matches', 'Matches')}</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {matches.map((m, i) => (
              <Badge key={i} variant="primary">
                {m}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// 4. UUID GENERATOR
// =============================================================================

function generateUuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function UuidGenerator() {
  const { t } = useTranslation();
  const [count, setCount] = useState(5);
  const [uuids, setUuids] = useState<string[]>([]);

  const handleGenerate = () => {
    setUuids(Array.from({ length: count }, generateUuid));
  };

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label={t('Count', 'Count')}
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            value={String(count)}
            onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
            wrapperClassName="sm:w-40"
          />
          <Button onClick={handleGenerate}>{t('Generate UUIDs', 'Generate UUIDs')}</Button>
        </div>
      </Card>
      {uuids.length > 0 && (
        <Card className="space-y-3">
          <FieldLabel>{t('Generated UUIDs', 'Generated UUIDs')}</FieldLabel>
          <div className="space-y-1.5">
            {uuids.map((uuid, i) => (
              <div
                key={i}
                className="rounded-lg bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border px-3 py-2 font-mono text-sm text-gray-800 dark:text-gray-100"
                dir="ltr"
              >
                {uuid}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// 5. BASE64 ENCODER / DECODER
// =============================================================================

function Base64Tool() {
  const { t } = useTranslation();
  const { addNotification } = useAppStore();
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const handleConvert = () => {
    try {
      if (mode === 'encode') {
        setOutput(btoa(unescape(encodeURIComponent(input))));
      } else {
        setOutput(decodeURIComponent(escape(atob(input.trim()))));
      }
    } catch {
      setOutput('');
      addNotification(t('Invalid Base64 input', 'Invalid Base64 input'), 'error');
    }
  };

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <Select
          label={t('Mode', 'Mode')}
          options={[
            { value: 'encode', label: t('Encode', 'Encode') },
            { value: 'decode', label: t('Decode', 'Decode') },
          ]}
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as 'encode' | 'decode');
            setOutput('');
          }}
        />
        <TextArea
          label={mode === 'encode' ? t('Plain text', 'Plain text') : t('Base64 string', 'Base64 string')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={5}
          className="font-mono"
        />
        <Button onClick={handleConvert} disabled={!input.trim()}>
          {t('Convert', 'Convert')}
        </Button>
      </Card>
      <ResultBox
        title={mode === 'encode' ? t('Base64 output', 'Base64 output') : t('Decoded text', 'Decoded text')}
        value={output}
        onClear={() => setOutput('')}
      />
    </div>
  );
}

// =============================================================================
// 6. HASH GENERATOR
// =============================================================================

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function HashGenerator() {
  const { t } = useTranslation();
  const { addNotification } = useAppStore();
  const [input, setInput] = useState('');
  const [algorithm, setAlgorithm] = useState('SHA-256');
  const [output, setOutput] = useState('');

  const handleGenerate = async () => {
    try {
      const data = new TextEncoder().encode(input);
      const buf = await crypto.subtle.digest(algorithm, data);
      setOutput(toHex(buf));
      addNotification(t('Hash generated', 'Hash generated'), 'success');
    } catch {
      addNotification(t('Error generating hash', 'Error generating hash'), 'error');
    }
  };

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <TextArea
          label={t('Input text', 'Input text')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={5}
        />
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label={t('Algorithm', 'Algorithm')}
            options={[
              { value: 'SHA-1', label: 'SHA-1' },
              { value: 'SHA-256', label: 'SHA-256' },
              { value: 'SHA-384', label: 'SHA-384' },
              { value: 'SHA-512', label: 'SHA-512' },
            ]}
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value)}
            wrapperClassName="sm:w-44"
          />
          <Button onClick={handleGenerate} disabled={!input.trim()}>
            {t('Generate hash', 'Generate hash')}
          </Button>
        </div>
      </Card>
      <ResultBox
        title={`${algorithm} ${t('Hash', 'Hash')}`}
        value={output}
        onClear={() => setOutput('')}
      />
    </div>
  );
}

// =============================================================================
// 7. PASSWORD GENERATOR
// =============================================================================

function PasswordGeneratorTool() {
  const { t } = useTranslation();
  const { addNotification } = useAppStore();
  const [length, setLength] = useState(16);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [password, setPassword] = useState('');

  const generate = () => {
    const sets: string[] = [];
    if (uppercase) sets.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    if (lowercase) sets.push('abcdefghijklmnopqrstuvwxyz');
    if (numbers) sets.push('0123456789');
    if (symbols) sets.push('!@#$%^&*()_+-=[]{}|;:,.<>?');
    if (sets.length === 0) {
      addNotification(t('Select at least one character set', 'Select at least one character set'), 'warning');
      return;
    }
    const all = sets.join('');
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += all[array[i] % all.length];
    }
    // Ensure at least one char from each selected set
    let final = result;
    sets.forEach((s) => {
      const rand = new Uint32Array(1);
      crypto.getRandomValues(rand);
      final = final.slice(0, -1) + s[rand[0] % s.length];
    });
    setPassword(final);
  };

  return (
    <div className="space-y-5">
      <Card className="space-y-5">
        <Slider
          min={6}
          max={64}
          value={length}
          onChange={setLength}
          label={t('Length', 'Length')}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: 'uppercase', label: t('Uppercase', 'Uppercase'), value: uppercase, set: setUppercase },
            { key: 'lowercase', label: t('Lowercase', 'Lowercase'), value: lowercase, set: setLowercase },
            { key: 'numbers', label: t('Numbers', 'Numbers'), value: numbers, set: setNumbers },
            { key: 'symbols', label: t('Symbols', 'Symbols'), value: symbols, set: setSymbols },
          ].map((opt) => (
            <label
              key={opt.key}
              className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={opt.value}
                onChange={(e) => opt.set(e.target.checked)}
                className="w-4 h-4 accent-primary-600"
              />
              {opt.label}
            </label>
          ))}
        </div>
        <Button onClick={generate} disabled={!uppercase && !lowercase && !numbers && !symbols}>
          {t('Generate password', 'Generate password')}
        </Button>
      </Card>
      {password && (
        <ResultBox title={t('Password', 'Password')} value={password} onClear={() => setPassword('')} />
      )}
    </div>
  );
}

// =============================================================================
// 8. HTML PREVIEW
// =============================================================================

function HtmlPreview() {
  const { t } = useTranslation();
  const [html, setHtml] = useState(
    '<h1>Hello Morven!</h1>\n<p>This is a live <strong>HTML</strong> preview.</p>',
  );
  const [srcDoc, setSrcDoc] = useState(
    '<h1>Hello Morven!</h1>\n<p>This is a live <strong>HTML</strong> preview.</p>',
  );

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <TextArea
          label={t('HTML code', 'HTML code')}
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={10}
          className="font-mono"
        />
        <Button onClick={() => setSrcDoc(html)}>{t('Update preview', 'Update preview')}</Button>
      </Card>
      <Card className="space-y-3">
        <FieldLabel>{t('Preview', 'Preview')}</FieldLabel>
        <div className="rounded-xl border border-light-border dark:border-dark-border overflow-hidden bg-white">
          <iframe
            title={t('HTML preview', 'HTML preview')}
            srcDoc={srcDoc}
            className="w-full min-h-[280px] bg-white"
            sandbox="allow-same-origin"
          />
        </div>
      </Card>
    </div>
  );
}

// =============================================================================
// 9. SVG VIEWER
// =============================================================================

function SvgViewer() {
  const { t } = useTranslation();
  const [svg, setSvg] = useState(
    '<svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">\n  <rect x="10" y="10" width="120" height="60" rx="8" fill="#4f46e5" />\n  <circle cx="160" cy="40" r="28" fill="#f59e0b" />\n</svg>',
  );

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <TextArea
          label={t('SVG code', 'SVG code')}
          value={svg}
          onChange={(e) => setSvg(e.target.value)}
          rows={10}
          className="font-mono"
        />
      </Card>
      <Card className="space-y-3">
        <FieldLabel>{t('Preview', 'Preview')}</FieldLabel>
        <div className="rounded-xl border border-light-border dark:border-dark-border overflow-hidden bg-white flex items-center justify-center min-h-[280px] p-6">
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      </Card>
    </div>
  );
}

// =============================================================================
// 10. COLOR PICKER
// =============================================================================

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function ColorPicker() {
  const { t } = useTranslation();
  const [color, setColor] = useState('#4f46e5');
  const rgb = hexToRgb(color);
  const hsl = (() => {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  })();

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-16 h-16 rounded-xl cursor-pointer border border-light-border dark:border-dark-border"
        />
        <div>
          <FieldLabel>{t('Pick a color', 'Pick a color')}</FieldLabel>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono" dir="ltr">
            {color}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ResultBox title="HEX" value={color} />
        <ResultBox title="RGB" value={`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`} />
        <ResultBox title="HSL" value={`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`} />
      </div>
    </Card>
  );
}

// =============================================================================
// 11. GRADIENT GENERATOR
// =============================================================================

function GradientGenerator() {
  const { t } = useTranslation();
  const [from, setFrom] = useState('#4f46e5');
  const [to, setTo] = useState('#ec4899');
  const [angle, setAngle] = useState(135);
  const css = `linear-gradient(${angle}deg, ${from}, ${to})`;

  return (
    <div className="space-y-5">
      <Card className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>{t('From color', 'From color')}</FieldLabel>
            <input
              type="color"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-2 w-16 h-12 rounded-lg cursor-pointer border border-light-border dark:border-dark-border"
            />
          </div>
          <div>
            <FieldLabel>{t('To color', 'To color')}</FieldLabel>
            <input
              type="color"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-2 w-16 h-12 rounded-lg cursor-pointer border border-light-border dark:border-dark-border"
            />
          </div>
        </div>
        <Slider
          min={0}
          max={360}
          value={angle}
          onChange={setAngle}
          label={t('Angle (deg)', 'Angle (deg)')}
          minLabel="0°"
          maxLabel="360°"
        />
        <div
          className="h-28 rounded-xl border border-light-border dark:border-dark-border"
          style={{ background: css }}
        />
      </Card>
      <ResultBox title={t('CSS code', 'CSS code')} value={`background: ${css};`} onClear={() => undefined} />
    </div>
  );
}

// =============================================================================
// 12. CSV <-> JSON
// =============================================================================

function parseCsv(csv: string): string[][] {
  return csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cells: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const ch of line) {
        if (ch === '"') inQuotes = !inQuotes;
        else if (ch === ',' && !inQuotes) {
          cells.push(current);
          current = '';
        } else current += ch;
      }
      cells.push(current);
      return cells.map((c) => c.trim());
    });
}

function CsvJson() {
  const { t } = useTranslation();
  const { addNotification } = useAppStore();
  const [mode, setMode] = useState<'csvToJson' | 'jsonToCsv'>('csvToJson');
  const [input, setInput] = useState('name,age,city\nAlice,25,Cairo\nBob,30,Alexandria');
  const [output, setOutput] = useState('');

  const handleConvert = () => {
    try {
      if (mode === 'csvToJson') {
        const rows = parseCsv(input);
        if (rows.length < 1) throw new Error('empty');
        const headers = rows[0];
        const result = rows.slice(1).map((row) => {
          const obj: Record<string, string> = {};
          headers.forEach((h, i) => (obj[h] = row[i] ?? ''));
          return obj;
        });
        setOutput(JSON.stringify(result, null, 2));
      } else {
        const parsed = JSON.parse(input) as Array<Record<string, unknown>>;
        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('array');
        const headers = Object.keys(parsed[0]);
        const escapeCsv = (v: unknown) => {
          const s = String(v ?? '');
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const lines = [
          headers.join(','),
          ...parsed.map((row) => headers.map((h) => escapeCsv(row[h])).join(',')),
        ];
        setOutput(lines.join('\n'));
      }
    } catch {
      setOutput('');
      addNotification(
        mode === 'csvToJson' ? t('Invalid CSV input', 'Invalid CSV input') : t('Invalid JSON input', 'Invalid JSON input'),
        'error',
      );
    }
  };

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <Select
          label={t('Mode', 'Mode')}
          options={[
            { value: 'csvToJson', label: t('CSV to JSON', 'CSV to JSON') },
            { value: 'jsonToCsv', label: t('JSON to CSV', 'JSON to CSV') },
          ]}
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as 'csvToJson' | 'jsonToCsv');
            setOutput('');
          }}
        />
        <TextArea
          label={mode === 'csvToJson' ? t('CSV data', 'CSV data') : t('JSON data', 'JSON data')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={8}
          className="font-mono"
        />
        <Button onClick={handleConvert} disabled={!input.trim()}>
          {t('Convert', 'Convert')}
        </Button>
      </Card>
      <ResultBox
        title={mode === 'csvToJson' ? t('JSON output', 'JSON output') : t('CSV output', 'CSV output')}
        value={output}
        onClear={() => setOutput('')}
      />
    </div>
  );
}

// =============================================================================
// 13. MARKDOWN TO HTML
// =============================================================================

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function markdownToHtml(md: string): string {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let list: string[] | null = null;

  const flushList = () => {
    if (list) {
      out.push(`<ul>\n${list.map((li) => `  <li>${li}</li>`).join('\n')}\n</ul>`);
      list = null;
    }
  };

  const inline = (s: string): string =>
    escapeHtml(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (/^(-|\*|\+) /.test(line)) {
      if (!list) list = [];
      list.push(inline(line.replace(/^(-|\*|\+) /, '')));
      continue;
    }
    flushList();
    const heading = line.match(/^(#{1,6})\s+(.*)/);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    const codeBlock = line.match(/^```/);
    if (codeBlock) {
      const rest = lines.slice(lines.indexOf(raw) + 1);
      const endIdx = rest.findIndex((l) => l.trim().startsWith('```'));
      const code = (endIdx === -1 ? rest : rest.slice(0, endIdx)).join('\n');
      out.push(`<pre><code>${escapeHtml(code)}</code></pre>`);
      break;
    }
    out.push(`<p>${inline(line)}</p>`);
  }
  flushList();
  return out.join('\n');
}

function MarkdownToHtml() {
  const { t } = useTranslation();
  const [md, setMd] = useState('# Hello\n\nThis is **bold** and *italic*.\n\n- Item one\n- Item two');
  const html = markdownToHtml(md);

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <TextArea
          label={t('Markdown input', 'Markdown input')}
          value={md}
          onChange={(e) => setMd(e.target.value)}
          rows={10}
          className="font-mono"
        />
      </Card>
      <ResultBox title={t('HTML output', 'HTML output')} value={html} onClear={() => setMd('')} />
      <Card className="space-y-3">
        <FieldLabel>{t('Preview', 'Preview')}</FieldLabel>
        <div
          className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 dark:prose-headings:text-white dark:prose-p:text-gray-300 min-h-[120px] rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface p-4"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </Card>
    </div>
  );
}

// =============================================================================
// 14. URL ENCODER / DECODER
// =============================================================================

function UrlEncoder() {
  const { t } = useTranslation();
  const { addNotification } = useAppStore();
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [input, setInput] = useState('https://example.com/?q=hello world');
  const [output, setOutput] = useState('');

  const handleConvert = () => {
    try {
      if (mode === 'encode') {
        setOutput(encodeURIComponent(input));
      } else {
        setOutput(decodeURIComponent(input.trim()));
      }
    } catch {
      setOutput('');
      addNotification(t('Invalid input', 'Invalid input'), 'error');
    }
  };

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <Select
          label={t('Mode', 'Mode')}
          options={[
            { value: 'encode', label: t('Encode', 'Encode') },
            { value: 'decode', label: t('Decode', 'Decode') },
          ]}
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as 'encode' | 'decode');
            setOutput('');
          }}
        />
        <TextArea
          label={t('Input', 'Input')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          className="font-mono"
        />
        <Button onClick={handleConvert} disabled={!input.trim()}>
          {t('Convert', 'Convert')}
        </Button>
      </Card>
      <ResultBox
        title={mode === 'encode' ? t('Encoded URL', 'Encoded URL') : t('Decoded URL', 'Decoded URL')}
        value={output}
        onClear={() => setOutput('')}
      />
    </div>
  );
}

// =============================================================================
// 15. HTTP STATUS CODES
// =============================================================================

const HTTP_STATUS_CODES: { code: number; name: string; category: string; description: string }[] = [
  { code: 100, name: 'Continue', category: '1xx', description: 'The server has received the request headers.' },
  { code: 200, name: 'OK', category: '2xx', description: 'The request was successful.' },
  { code: 201, name: 'Created', category: '2xx', description: 'A resource was successfully created.' },
  { code: 204, name: 'No Content', category: '2xx', description: 'Request succeeded with no response body.' },
  { code: 301, name: 'Moved Permanently', category: '3xx', description: 'Resource moved permanently to a new URL.' },
  { code: 302, name: 'Found', category: '3xx', description: 'Resource found at a temporary URL.' },
  { code: 304, name: 'Not Modified', category: '3xx', description: 'Cached copy is still valid.' },
  { code: 400, name: 'Bad Request', category: '4xx', description: 'The server could not understand the request.' },
  { code: 401, name: 'Unauthorized', category: '4xx', description: 'Authentication is required.' },
  { code: 403, name: 'Forbidden', category: '4xx', description: 'The client does not have access rights.' },
  { code: 404, name: 'Not Found', category: '4xx', description: 'The requested resource does not exist.' },
  { code: 409, name: 'Conflict', category: '4xx', description: 'The request conflicts with current state.' },
  { code: 422, name: 'Unprocessable Entity', category: '4xx', description: 'The request was well-formed but invalid.' },
  { code: 429, name: 'Too Many Requests', category: '4xx', description: 'The client sent too many requests.' },
  { code: 500, name: 'Internal Server Error', category: '5xx', description: 'A generic server-side error occurred.' },
  { code: 502, name: 'Bad Gateway', category: '5xx', description: 'An invalid response from the upstream server.' },
  { code: 503, name: 'Service Unavailable', category: '5xx', description: 'The server is temporarily unavailable.' },
  { code: 504, name: 'Gateway Timeout', category: '5xx', description: 'The upstream server did not respond in time.' },
];

function HttpStatusCodes() {
  const { t } = useTranslation();
  const { language } = useLanguageStore();
  const [query, setQuery] = useState('');

  const filtered = HTTP_STATUS_CODES.filter(
    (s) =>
      String(s.code).includes(query.trim()) ||
      s.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <Input
          label={t('Search', 'Search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={language === 'ar' ? 'بحث...' : 'e.g. 404 or Not Found'}
        />
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((s) => (
          <Card key={s.code} padding="sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-lg font-bold text-primary-600 dark:text-primary-400">{s.code}</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{s.name}</p>
              </div>
              <Badge variant="neutral" size="sm">
                {s.category}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{s.description}</p>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && (
        <EmptyState
          icon={<span className="text-4xl">🔍</span>}
          title={language === 'ar' ? 'لا توجد نتائج' : 'No results found'}
        />
      )}
    </div>
  );
}

// =============================================================================
// 16. REST METHODS
// =============================================================================

const REST_METHODS: { method: string; purpose: string; safe: boolean; idempotent: boolean; example: string }[] = [
  { method: 'GET', purpose: 'Retrieve a resource', safe: true, idempotent: true, example: 'GET /users' },
  { method: 'POST', purpose: 'Create a new resource', safe: false, idempotent: false, example: 'POST /users' },
  { method: 'PUT', purpose: 'Replace a resource entirely', safe: false, idempotent: true, example: 'PUT /users/1' },
  { method: 'PATCH', purpose: 'Partially update a resource', safe: false, idempotent: false, example: 'PATCH /users/1' },
  { method: 'DELETE', purpose: 'Delete a resource', safe: false, idempotent: true, example: 'DELETE /users/1' },
  { method: 'HEAD', purpose: 'Same as GET without a body', safe: true, idempotent: true, example: 'HEAD /users' },
  { method: 'OPTIONS', purpose: 'Describe communication options', safe: true, idempotent: true, example: 'OPTIONS /users' },
];

function RestMethods() {
  const { t } = useTranslation();
  const { language } = useLanguageStore();
  const isRtl = language === 'ar';

  return (
    <div className="space-y-3">
      {REST_METHODS.map((m) => (
        <Card key={m.method} padding="sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-primary-600 dark:text-primary-400 text-lg">{m.method}</span>
              <span className="text-sm text-gray-600 dark:text-gray-300">{m.purpose}</span>
            </div>
            <div className="flex gap-2">
              <Badge variant={m.safe ? 'success' : 'warning'} size="sm">
                {isRtl ? (m.safe ? 'آمن' : 'غير آمن') : m.safe ? 'Safe' : 'Unsafe'}
              </Badge>
              <Badge variant={m.idempotent ? 'info' : 'neutral'} size="sm">
                {isRtl ? (m.idempotent ? 'تكرار آمن' : 'غير قابل للتكرار') : m.idempotent ? 'Idempotent' : 'Non-idempotent'}
              </Badge>
            </div>
          </div>
          <p className="mt-2 text-sm font-mono text-gray-500 dark:text-gray-400" dir="ltr">
            {m.example}
          </p>
        </Card>
      ))}
    </div>
  );
}

// =============================================================================
// 17. CSV TO SQL
// =============================================================================

function csvToSql(csv: string, tableName: string): string {
  const rows = parseCsv(csv);
  if (rows.length < 2) return '';
  const headers = rows[0].map((h) => h.replace(/[^A-Za-z0-9_]/g, '_'));
  const escapeVal = (v: string) => {
    if (v === '') return 'NULL';
    if (/^-?\d+(\.\d+)?$/.test(v)) return v;
    return `'${v.replace(/'/g, "''")}'`;
  };
  const insertRows = rows.slice(1).map((row) => {
    const values = headers.map((_, i) => escapeVal(row[i] ?? '')).join(', ');
    return `INSERT INTO ${tableName} (${headers.join(', ')}) VALUES (${values});`;
  });
  return insertRows.join('\n');
}

function CsvToSql() {
  const { t } = useTranslation();
  const { addNotification } = useAppStore();
  const [csv, setCsv] = useState('name,age,city\nAlice,25,Cairo\nBob,30,Alexandria');
  const [tableName, setTableName] = useState('users');
  const [sql, setSql] = useState('');

  const handleGenerate = () => {
    if (!tableName.trim()) {
      addNotification(t('Enter a table name', 'Enter a table name'), 'warning');
      return;
    }
    try {
      setSql(csvToSql(csv, tableName.trim().replace(/[^A-Za-z0-9_]/g, '_')));
    } catch {
      setSql('');
      addNotification(t('Invalid CSV input', 'Invalid CSV input'), 'error');
    }
  };

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <Input
          label={t('Table name', 'Table name')}
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          className="font-mono"
          dir="ltr"
        />
        <TextArea
          label={t('CSV data', 'CSV data')}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={8}
          className="font-mono"
        />
        <Button onClick={handleGenerate} disabled={!csv.trim()}>
          {t('Generate SQL', 'Generate SQL')}
        </Button>
      </Card>
      <ResultBox title={t('SQL output', 'SQL output')} value={sql} onClear={() => setSql('')} />
    </div>
  );
}

// =============================================================================
// 18. JSON TO SQL
// =============================================================================

function JsonToSql() {
  const { t } = useTranslation();
  const { addNotification } = useAppStore();
  const [json, setJson] = useState('[\n  { "name": "Alice", "age": 25 },\n  { "name": "Bob", "age": 30 }\n]');
  const [tableName, setTableName] = useState('users');
  const [sql, setSql] = useState('');

  const handleGenerate = () => {
    if (!tableName.trim()) {
      addNotification(t('Enter a table name', 'Enter a table name'), 'warning');
      return;
    }
    try {
      const parsed = JSON.parse(json) as Array<Record<string, unknown>>;
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('array');
      const table = tableName.trim().replace(/[^A-Za-z0-9_]/g, '_');
      const headers = Object.keys(parsed[0]);
      const escapeVal = (v: unknown) => {
        if (v === null || v === undefined || v === '') return 'NULL';
        if (typeof v === 'number' && isFinite(v)) return String(v);
        return `'${String(v).replace(/'/g, "''")}'`;
      };
      const insertRows = parsed.map((row) => {
        const values = headers.map((h) => escapeVal(row[h])).join(', ');
        return `INSERT INTO ${table} (${headers.join(', ')}) VALUES (${values});`;
      });
      setSql(insertRows.join('\n'));
    } catch {
      setSql('');
      addNotification(t('Invalid JSON input', 'Invalid JSON input'), 'error');
    }
  };

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <Input
          label={t('Table name', 'Table name')}
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          className="font-mono"
          dir="ltr"
        />
        <TextArea
          label={t('JSON data', 'JSON data')}
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={8}
          className="font-mono"
        />
        <Button onClick={handleGenerate} disabled={!json.trim()}>
          {t('Generate SQL', 'Generate SQL')}
        </Button>
      </Card>
      <ResultBox title={t('SQL output', 'SQL output')} value={sql} onClear={() => setSql('')} />
    </div>
  );
}

// =============================================================================
// 19-21. CHEAT SHEETS
// =============================================================================

function CheatSheet({ groups }: { groups: { title: string; items: { cmd: string; desc: string }[] }[] }) {
  const { language } = useLanguageStore();
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <Card key={g.title} className="space-y-3">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">{g.title}</h3>
          <div className="space-y-2">
            {g.items.map((item) => (
              <div key={item.cmd} className="rounded-lg bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border px-3 py-2">
                <p className="font-mono text-sm text-primary-600 dark:text-primary-400" dir="ltr">
                  {item.cmd}
                </p>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {language === 'ar' && (item as { descAr?: string }).descAr
                    ? (item as { descAr?: string }).descAr
                    : item.desc}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

const GIT_CHEATSHEET = [
  {
    title: 'Setup',
    items: [
      { cmd: 'git config --global user.name "Name"', desc: 'Set your global username', descAr: 'تعيين اسم المستخدم العام' },
      { cmd: 'git config --global user.email "email"', desc: 'Set your global email', descAr: 'تعيين البريد الإلكتروني العام' },
      { cmd: 'git init', desc: 'Initialize a new repository', descAr: 'تهيئة مستودع جديد' },
    ],
  },
  {
    title: 'Working with changes',
    items: [
      { cmd: 'git status', desc: 'Show the working tree status', descAr: 'عرض حالة شجرة العمل' },
      { cmd: 'git add <file>', desc: 'Stage a file', descAr: 'إضافة ملف إلى المرحلة' },
      { cmd: 'git add .', desc: 'Stage all changes', descAr: 'إضافة جميع التغييرات' },
      { cmd: 'git commit -m "message"', desc: 'Commit staged changes', descAr: 'حفظ التغييرات المرحّلة' },
      { cmd: 'git diff', desc: 'Show unstaged changes', descAr: 'عرض التغييرات غير المرحّلة' },
      { cmd: 'git log', desc: 'Show commit history', descAr: 'عرض سجل الحفظ' },
    ],
  },
  {
    title: 'Branches',
    items: [
      { cmd: 'git branch', desc: 'List local branches', descAr: 'عرض الفروع المحلية' },
      { cmd: 'git branch <name>', desc: 'Create a new branch', descAr: 'إنشاء فرع جديد' },
      { cmd: 'git checkout -b <name>', desc: 'Create and switch to a branch', descAr: 'إنشاء فرع والانتقال إليه' },
      { cmd: 'git merge <branch>', desc: 'Merge a branch into current', descAr: 'دمج فرع في الفرع الحالي' },
    ],
  },
  {
    title: 'Remote',
    items: [
      { cmd: 'git remote add origin <url>', desc: 'Add a remote repository', descAr: 'إضافة مستودع بعيد' },
      { cmd: 'git push -u origin main', desc: 'Push and set upstream', descAr: 'رفع وتحديد الفرع الأساسي' },
      { cmd: 'git pull', desc: 'Fetch and merge changes', descAr: 'جلب ودمج التغييرات' },
      { cmd: 'git clone <url>', desc: 'Clone a repository', descAr: 'استنساخ مستودع' },
    ],
  },
];

const LINUX_CHEATSHEET = [
  {
    title: 'Navigation',
    items: [
      { cmd: 'ls -la', desc: 'List all files with details', descAr: 'عرض جميع الملفات بالتفاصيل' },
      { cmd: 'cd <dir>', desc: 'Change directory', descAr: 'تغيير الدليل' },
      { cmd: 'pwd', desc: 'Print working directory', descAr: 'عرض الدليل الحالي' },
      { cmd: 'mkdir <dir>', desc: 'Create a directory', descAr: 'إنشاء دليل' },
      { cmd: 'rm -rf <dir>', desc: 'Remove a directory recursively', descAr: 'حذف دليل بالكامل' },
    ],
  },
  {
    title: 'File operations',
    items: [
      { cmd: 'cp <src> <dest>', desc: 'Copy files', descAr: 'نسخ الملفات' },
      { cmd: 'mv <src> <dest>', desc: 'Move or rename files', descAr: 'نقل أو إعادة تسمية الملفات' },
      { cmd: 'cat <file>', desc: 'Print file content', descAr: 'عرض محتوى الملف' },
      { cmd: 'less <file>', desc: 'View file page by page', descAr: 'عرض الملف صفحة بصفحة' },
      { cmd: 'head / tail <file>', desc: 'View the start / end of a file', descAr: 'عرض بداية أو نهاية الملف' },
      { cmd: 'chmod 755 <file>', desc: 'Change file permissions', descAr: 'تغيير صلاحيات الملف' },
    ],
  },
  {
    title: 'System',
    items: [
      { cmd: 'ps aux', desc: 'List running processes', descAr: 'عرض العمليات الجارية' },
      { cmd: 'top / htop', desc: 'Monitor system resources', descAr: 'مراقبة موارد النظام' },
      { cmd: 'df -h', desc: 'Show disk usage', descAr: 'عرض استخدام القرص' },
      { cmd: 'free -h', desc: 'Show memory usage', descAr: 'عرض استخدام الذاكرة' },
      { cmd: 'sudo <cmd>', desc: 'Run a command as root', descAr: 'تشغيل أمر بصلاحيات المدير' },
      { cmd: 'grep <pattern> <file>', desc: 'Search text in files', descAr: 'البحث عن نص في الملفات' },
    ],
  },
];

const REGEX_CHEATSHEET = [
  {
    title: 'Anchors',
    items: [
      { cmd: '^', desc: 'Start of a line', descAr: 'بداية السطر' },
      { cmd: '$', desc: 'End of a line', descAr: 'نهاية السطر' },
      { cmd: '\\b', desc: 'Word boundary', descAr: 'حدود الكلمة' },
    ],
  },
  {
    title: 'Character classes',
    items: [
      { cmd: '\\d', desc: 'Any digit (0-9)', descAr: 'أي رقم (0-9)' },
      { cmd: '\\w', desc: 'Word character', descAr: 'حرف كلمة' },
      { cmd: '\\s', desc: 'Whitespace', descAr: 'مسافة بيضاء' },
      { cmd: '.', desc: 'Any character', descAr: 'أي حرف' },
      { cmd: '[abc]', desc: 'Any of a, b, or c', descAr: 'أي من الأحرف a أو b أو c' },
    ],
  },
  {
    title: 'Quantifiers',
    items: [
      { cmd: '*', desc: 'Zero or more', descAr: 'صفر أو أكثر' },
      { cmd: '+', desc: 'One or more', descAr: 'واحد أو أكثر' },
      { cmd: '?', desc: 'Zero or one', descAr: 'صفر أو واحد' },
      { cmd: '{n}', desc: 'Exactly n times', descAr: 'n مرة بالضبط' },
      { cmd: '{n,m}', desc: 'Between n and m times', descAr: 'بين n وm مرة' },
    ],
  },
  {
    title: 'Groups & alternation',
    items: [
      { cmd: '(abc)', desc: 'Capture group', descAr: 'مجموعة التقاط' },
      { cmd: '(?:abc)', desc: 'Non-capturing group', descAr: 'مجموعة بدون التقاط' },
      { cmd: 'a|b', desc: 'Alternation (a or b)', descAr: 'بديل (a أو b)' },
      { cmd: '\\1', desc: 'Backreference', descAr: 'مرجع خلفي' },
    ],
  },
];

const HTML_ENTITIES: { entity: string; char: string; name: string }[] = [
  { entity: '&amp;', char: '&', name: 'Ampersand' },
  { entity: '&lt;', char: '<', name: 'Less than' },
  { entity: '&gt;', char: '>', name: 'Greater than' },
  { entity: '&quot;', char: '"', name: 'Double quote' },
  { entity: '&#39;', char: "'", name: 'Single quote' },
  { entity: '&nbsp;', char: '\u00A0', name: 'Non-breaking space' },
  { entity: '&copy;', char: '\u00A9', name: 'Copyright' },
  { entity: '&reg;', char: '\u00AE', name: 'Registered trademark' },
  { entity: '&trade;', char: '\u2122', name: 'Trademark' },
  { entity: '&euro;', char: '\u20AC', name: 'Euro' },
  { entity: '&pound;', char: '\u00A3', name: 'Pound' },
  { entity: '&yen;', char: '\u00A5', name: 'Yen' },
  { entity: '&cent;', char: '\u00A2', name: 'Cent' },
  { entity: '&mdash;', char: '\u2014', name: 'Em dash' },
  { entity: '&ndash;', char: '\u2013', name: 'En dash' },
  { entity: '&hellip;', char: '\u2026', name: 'Ellipsis' },
  { entity: '&apos;', char: "'", name: 'Apostrophe' },
];

// =============================================================================
// 22. ASCII TABLE
// =============================================================================

function AsciiTable() {
  const { language } = useLanguageStore();
  const rows = Array.from({ length: 128 }, (_, i) => i);

  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm" dir="ltr">
        <thead>
          <tr className="border-b border-light-border dark:border-dark-border">
            <th className="text-start py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">{language === 'ar' ? 'عشري' : 'Dec'}</th>
            <th className="text-start py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Hex</th>
            <th className="text-start py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">{language === 'ar' ? 'ثنائي' : 'Bin'}</th>
            <th className="text-start py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">{language === 'ar' ? 'الحرف' : 'Char'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i} className="border-b border-light-border/50 dark:border-dark-border/50">
              <td className="py-1.5 px-3 font-mono text-gray-600 dark:text-gray-400">{i}</td>
              <td className="py-1.5 px-3 font-mono text-gray-600 dark:text-gray-400">{i.toString(16).toUpperCase().padStart(2, '0')}</td>
              <td className="py-1.5 px-3 font-mono text-gray-600 dark:text-gray-400">{i.toString(2).padStart(8, '0')}</td>
              <td className="py-1.5 px-3 font-mono text-gray-800 dark:text-gray-200">
                {i >= 32 && i <= 126 ? String.fromCharCode(i) : <span className="text-gray-400 dark:text-gray-600">·</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// =============================================================================
// 23. UNIX TIMESTAMP
// =============================================================================

function UnixTimestamp() {
  const { t } = useTranslation();
  const { language } = useLanguageStore();
  const [timestamp, setTimestamp] = useState(() => String(Math.floor(Date.now() / 1000)));
  const [dateString, setDateString] = useState(() => new Date().toISOString().slice(0, 16));
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [convertedDate, setConvertedDate] = useState('');

  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTimestampToDate = () => {
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts)) return;
    setConvertedDate(new Date(ts * 1000).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US'));
  };

  const handleDateToTimestamp = () => {
    const ts = Math.floor(new Date(dateString).getTime() / 1000);
    if (isNaN(ts)) return;
    setTimestamp(String(ts));
  };

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-500/20 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('Current Unix timestamp', 'Current Unix timestamp')}</p>
          <p className="font-mono text-2xl font-bold text-primary-600 dark:text-primary-400" dir="ltr">
            {now}
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <Input
              label={t('Timestamp (seconds)', 'Timestamp (seconds)')}
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              className="font-mono"
              dir="ltr"
              wrapperClassName="flex-1"
            />
            <Button onClick={handleTimestampToDate}>{t('To date', 'To date')}</Button>
          </div>
          {convertedDate && (
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{convertedDate}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <Input
              label={t('Date & time', 'Date & time')}
              type="datetime-local"
              value={dateString}
              onChange={(e) => setDateString(e.target.value)}
              wrapperClassName="flex-1"
            />
            <Button onClick={handleDateToTimestamp}>{t('To timestamp', 'To timestamp')}</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// =============================================================================
// 24. QR CODE GENERATOR
// =============================================================================

function QrGeneratorTool() {
  const { t } = useTranslation();
  const { addNotification } = useAppStore();
  const [text, setText] = useState('https://morven.app');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!text.trim()) {
      addNotification(t('Please enter content', 'Please enter content'), 'warning');
      return;
    }
    setGenerating(true);
    try {
      const dataUrl = await QRCode.toDataURL(text.trim(), { width: 320, margin: 2, errorCorrectionLevel: 'M' });
      setQrDataUrl(dataUrl);
    } catch {
      addNotification(t('Error generating QR code', 'Error generating QR code'), 'error');
    } finally {
      setGenerating(false);
    }
  }, [text, addNotification, t]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'qr-code.png';
    a.click();
  };

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <TextArea
          label={t('Text or URL', 'Text or URL')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
        />
        <Button onClick={handleGenerate} loading={generating} disabled={!text.trim()}>
          {t('Generate QR code', 'Generate QR code')}
        </Button>
      </Card>
      {qrDataUrl && (
        <Card className="space-y-4 items-center text-center">
          <FieldLabel>{t('QR Code', 'QR Code')}</FieldLabel>
          <img src={qrDataUrl} alt="QR Code" className="mx-auto w-56 h-56 rounded-xl" />
          <Button variant="secondary" onClick={handleDownload}>
            {t('Download PNG', 'Download PNG')}
          </Button>
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// 25. LOREM IPSUM
// =============================================================================

const LOREM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
  'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
  'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
  'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum',
];

function LoremIpsum() {
  const { t } = useTranslation();
  const [paragraphs, setParagraphs] = useState(3);
  const [wordsPer, setWordsPer] = useState(30);
  const [output, setOutput] = useState('');

  const handleGenerate = () => {
    const sentences: string[] = [];
    for (let p = 0; p < paragraphs; p++) {
      const sentenceCount = Math.max(3, Math.round(wordsPer / 9));
      const para: string[] = [];
      for (let s = 0; s < sentenceCount; s++) {
        const count = Math.max(5, Math.round(wordsPer / sentenceCount));
        const words: string[] = [];
        for (let w = 0; w < count; w++) {
          words.push(LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]);
        }
        para.push(words.join(' ') + '.');
      }
      sentences.push(para.join(' '));
    }
    setOutput(sentences.join('\n\n'));
  };

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('Paragraphs', 'Paragraphs')}
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            value={String(paragraphs)}
            onChange={(e) => setParagraphs(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
          />
          <Input
            label={t('Words per paragraph', 'Words per paragraph')}
            type="number"
            inputMode="numeric"
            min={5}
            max={200}
            value={String(wordsPer)}
            onChange={(e) => setWordsPer(Math.max(5, Math.min(200, parseInt(e.target.value) || 5)))}
          />
        </div>
        <Button onClick={handleGenerate}>{t('Generate text', 'Generate text')}</Button>
      </Card>
      <ResultBox title={t('Lorem Ipsum', 'Lorem Ipsum')} value={output} onClear={() => setOutput('')} />
    </div>
  );
}

// =============================================================================
// 26. RANDOM DATA
// =============================================================================

const FIRST_NAMES = ['Ahmad', 'Mona', 'Yousef', 'Sara', 'Omar', 'Layla', 'Khalid', 'Nour', 'Adam', 'Huda', 'Ibrahim', 'Rana', 'Tariq', 'Dina', 'Samir', 'Aya', 'Fadi', 'Reem', 'Ziad', 'Hana'];
const LAST_NAMES = ['Hassan', 'Ali', 'Saeed', 'Nasser', 'Khalil', 'Salem', 'Othman', 'Nabil', 'Rashid', 'Farid', 'Sabri', 'Mansour', 'Zaki', 'Barakat', 'Shaheen', 'Awad', 'Dagher', 'Rizk', 'Toma', 'Nakhle'];
const CITIES = ['Cairo', 'Alexandria', 'Riyadh', 'Dubai', 'Beirut', 'Amman', 'Damascus', 'Baghdad', 'Tunis', 'Casablanca', 'Kuwait City', 'Doha'];
const WORDS = ['student', 'engineer', 'doctor', 'teacher', 'designer', 'developer', 'analyst', 'manager', 'researcher', 'writer', 'artist', 'nurse', 'accountant', 'architect'];

function RandomData() {
  const { t } = useTranslation();
  const { language } = useLanguageStore();
  const [type, setType] = useState<'names' | 'emails' | 'phones' | 'numbers' | 'words'>('names');
  const [count, setCount] = useState(5);
  const [output, setOutput] = useState('');

  const handleGenerate = () => {
    const rows: string[] = [];
    for (let i = 0; i < count; i++) {
      const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const city = CITIES[Math.floor(Math.random() * CITIES.length)];
      switch (type) {
        case 'names':
          rows.push(`${first} ${last}`);
          break;
        case 'emails':
          rows.push(`${first.toLowerCase()}.${last.toLowerCase()}${Math.floor(Math.random() * 100)}@example.com`);
          break;
        case 'phones':
          rows.push(`+20 10${Math.floor(10000000 + Math.random() * 90000000)}`);
          break;
        case 'numbers':
          rows.push(String(Math.floor(Math.random() * 1000000)));
          break;
        case 'words':
          rows.push(`${WORDS[Math.floor(Math.random() * WORDS.length)]} ${first} ${city}`);
          break;
      }
    }
    setOutput(rows.join('\n'));
  };

  const typeOptions = [
    { value: 'names', label: t('Names', 'Names') },
    { value: 'emails', label: t('Emails', 'Emails') },
    { value: 'phones', label: t('Phone numbers', 'Phone numbers') },
    { value: 'numbers', label: t('Numbers', 'Numbers') },
    { value: 'words', label: t('Words & sentences', 'Words & sentences') },
  ];

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label={t('Data type', 'Data type')}
            options={typeOptions}
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
          />
          <Input
            label={t('Count', 'Count')}
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            value={String(count)}
            onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
          />
        </div>
        <Button onClick={handleGenerate}>{language === 'ar' ? 'توليد' : t('Generate', 'Generate')}</Button>
      </Card>
      <ResultBox title={t('Generated data', 'Generated data')} value={output} onClear={() => setOutput('')} />
    </div>
  );
}

// =============================================================================
// 27. PASSWORD STRENGTH
// =============================================================================

function PasswordStrength() {
  const { t } = useTranslation();
  const { language } = useLanguageStore();
  const [password, setPassword] = useState('');

  const analyze = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const score = analyze(password);
  const percent = (score / 5) * 100;
  const labels = [t('Very weak', 'Very weak'), t('Weak', 'Weak'), t('Fair', 'Fair'), t('Good', 'Good'), t('Strong', 'Strong')];
  const label = password ? labels[Math.max(0, score - 1)] : '';
  const color =
    score <= 1 ? 'bg-red-500' : score <= 2 ? 'bg-orange-500' : score <= 3 ? 'bg-amber-500' : score <= 4 ? 'bg-emerald-500' : 'bg-green-600';

  const suggestions = (() => {
    const list: string[] = [];
    if (password.length < 12) list.push(language === 'ar' ? 'استخدم 12 حرفاً على الأقل' : 'Use at least 12 characters');
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) list.push(language === 'ar' ? 'امزج الأحرف الكبيرة والصغيرة' : 'Mix uppercase and lowercase letters');
    if (!/\d/.test(password)) list.push(language === 'ar' ? 'أضف أرقاماً' : 'Add numbers');
    if (!/[^A-Za-z0-9]/.test(password)) list.push(language === 'ar' ? 'أضف رموزاً خاصة' : 'Add special symbols');
    return list;
  })();

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <Input
          label={t('Password', 'Password')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={language === 'ar' ? 'اكتب كلمة مرور لتحليلها' : 'Type a password to analyze'}
        />
        {password && (
          <>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Strength', 'Strength')}</span>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{label}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-200 dark:bg-dark-border overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
            {suggestions.length > 0 && (
              <ul className="space-y-1">
                {suggestions.map((s, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="text-amber-500">⚠</span> {s}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

// =============================================================================
// 28. HASH VERIFIER
// =============================================================================

function HashVerifier() {
  const { t } = useTranslation();
  const { language } = useLanguageStore();
  const [text, setText] = useState('');
  const [expected, setExpected] = useState('');
  const [algorithm, setAlgorithm] = useState('SHA-256');
  const [status, setStatus] = useState<'idle' | 'match' | 'no-match'>('idle');
  const [actual, setActual] = useState('');

  const handleVerify = async () => {
    try {
      const data = new TextEncoder().encode(text);
      const buf = await crypto.subtle.digest(algorithm, data);
      const hash = toHex(buf);
      setActual(hash);
      setStatus(hash.toLowerCase() === expected.trim().toLowerCase() ? 'match' : 'no-match');
    } catch {
      setStatus('idle');
    }
  };

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <TextArea
          label={t('Input text', 'Input text')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('Expected hash', 'Expected hash')}
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
            className="font-mono"
            dir="ltr"
            placeholder="e3b0c44298fc..."
          />
          <Select
            label={t('Algorithm', 'Algorithm')}
            options={[
              { value: 'SHA-1', label: 'SHA-1' },
              { value: 'SHA-256', label: 'SHA-256' },
              { value: 'SHA-384', label: 'SHA-384' },
              { value: 'SHA-512', label: 'SHA-512' },
            ]}
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value)}
          />
        </div>
        <Button onClick={handleVerify} disabled={!text.trim() || !expected.trim()}>
          {t('Verify', 'Verify')}
        </Button>
      </Card>
      {status !== 'idle' && (
        <Card
          className={`border-2 ${
            status === 'match'
              ? 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-900/10'
              : 'border-red-500/40 bg-red-50 dark:bg-red-900/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{status === 'match' ? '✅' : '❌'}</span>
            <div className="flex-1">
              <p className={`font-semibold ${status === 'match' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                {status === 'match'
                  ? (language === 'ar' ? 'التجزئة متطابقة!' : 'Hash matches!')
                  : (language === 'ar' ? 'التجزئة غير متطابقة' : 'Hash does not match')}
              </p>
              {actual && (
                <p className="mt-1 text-xs font-mono text-gray-500 dark:text-gray-400 break-all" dir="ltr">
                  {actual}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// 29. HMAC GENERATOR
// =============================================================================

function HmacGenerator() {
  const { t } = useTranslation();
  const { addNotification } = useAppStore();
  const [text, setText] = useState('');
  const [secret, setSecret] = useState('');
  const [algorithm, setAlgorithm] = useState('SHA-256');
  const [output, setOutput] = useState('');

  const handleGenerate = async () => {
    if (!text.trim() || !secret.trim()) {
      addNotification(t('Enter both text and secret key', 'Enter both text and secret key'), 'warning');
      return;
    }
    try {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: algorithm },
        false,
        ['sign'],
      );
      const sig = await crypto.subtle.sign('HMAC', key, enc.encode(text));
      setOutput(toHex(sig));
    } catch {
      setOutput('');
      addNotification(t('Error generating HMAC', 'Error generating HMAC'), 'error');
    }
  };

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <TextArea
          label={t('Input text', 'Input text')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('Secret key', 'Secret key')}
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            dir="ltr"
          />
          <Select
            label={t('Algorithm', 'Algorithm')}
            options={[
              { value: 'SHA-1', label: 'SHA-1' },
              { value: 'SHA-256', label: 'SHA-256' },
              { value: 'SHA-384', label: 'SHA-384' },
              { value: 'SHA-512', label: 'SHA-512' },
            ]}
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value)}
          />
        </div>
        <Button onClick={handleGenerate}>{t('Generate HMAC', 'Generate HMAC')}</Button>
      </Card>
      <ResultBox title="HMAC" value={output} onClear={() => setOutput('')} />
    </div>
  );
}

// =============================================================================
// Coming soon placeholder
// =============================================================================

function ComingSoonTool() {
  const { t } = useTranslation();
  return (
    <Card className="text-center py-16">
      <div className="text-5xl mb-4">🔧</div>
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
        {t('Coming Soon', 'Coming Soon')}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t('This engineering tool is under development.', 'This engineering tool is under development.')}
      </p>
    </Card>
  );
}

// =============================================================================
// Main page
// =============================================================================

interface EngineeringToolPageProps {
  toolId: string;
}

export default function EngineeringToolPage({ toolId }: EngineeringToolPageProps) {
  const { t } = useTranslation();
  const { language } = useLanguageStore();
  const tool = getToolById(toolId);

  let content: React.ReactNode;

  switch (toolId) {
    case 'json-formatter':
      content = <JsonFormatter />;
      break;
    case 'json-validator':
      content = <JsonValidator />;
      break;
    case 'regex-tester':
      content = <RegexTester />;
      break;
    case 'uuid-generator':
      content = <UuidGenerator />;
      break;
    case 'base64-encoder':
      content = <Base64Tool />;
      break;
    case 'hash-generator':
      content = <HashGenerator />;
      break;
    case 'password-generator':
      content = <PasswordGeneratorTool />;
      break;
    case 'html-preview':
      content = <HtmlPreview />;
      break;
    case 'svg-viewer':
      content = <SvgViewer />;
      break;
    case 'color-picker':
      content = <ColorPicker />;
      break;
    case 'gradient-generator':
      content = <GradientGenerator />;
      break;
    case 'csv-json':
      content = <CsvJson />;
      break;
    case 'markdown-html':
      content = <MarkdownToHtml />;
      break;
    case 'url-encoder':
      content = <UrlEncoder />;
      break;
    case 'http-status-codes':
      content = <HttpStatusCodes />;
      break;
    case 'rest-methods':
      content = <RestMethods />;
      break;
    case 'csv-to-sql':
      content = <CsvToSql />;
      break;
    case 'json-to-sql':
      content = <JsonToSql />;
      break;
    case 'git-cheatsheet':
      content = <CheatSheet groups={GIT_CHEATSHEET} />;
      break;
    case 'linux-commands':
      content = <CheatSheet groups={LINUX_CHEATSHEET} />;
      break;
    case 'regex-cheatsheet':
      content = <CheatSheet groups={REGEX_CHEATSHEET} />;
      break;
    case 'html-entities':
      content = (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm" dir="ltr">
            <thead>
              <tr className="border-b border-light-border dark:border-dark-border">
                <th className="text-start py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Entity</th>
                <th className="text-start py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">{t('Character', 'Character')}</th>
                <th className="text-start py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">{t('Name', 'Name')}</th>
              </tr>
            </thead>
            <tbody>
              {HTML_ENTITIES.map((e) => (
                <tr key={e.entity} className="border-b border-light-border/50 dark:border-dark-border/50">
                  <td className="py-1.5 px-3 font-mono text-primary-600 dark:text-primary-400">{e.entity}</td>
                  <td className="py-1.5 px-3 font-mono text-gray-800 dark:text-gray-200">{e.char}</td>
                  <td className="py-1.5 px-3 text-gray-600 dark:text-gray-400">{e.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      );
      break;
    case 'ascii-table':
      content = <AsciiTable />;
      break;
    case 'unix-timestamp':
      content = <UnixTimestamp />;
      break;
    case 'qr-generator-eng':
      content = <QrGeneratorTool />;
      break;
    case 'lorem-ipsum':
      content = <LoremIpsum />;
      break;
    case 'random-data':
      content = <RandomData />;
      break;
    case 'password-strength':
      content = <PasswordStrength />;
      break;
    case 'hash-verifier':
      content = <HashVerifier />;
      break;
    case 'hmac-generator':
      content = <HmacGenerator />;
      break;
    default:
      content = <ComingSoonTool />;
      break;
  }

  return (
    <ToolLayout
      backTo="/category/engineering"
      backLabel={language === 'ar' ? 'العودة للأدوات الهندسية' : 'Back to Engineering Tools'}
    >
      {tool && (
        <ToolHero
          icon={<tool.icon className="w-8 h-8 text-primary-600 dark:text-primary-400" />}
          title={language === 'ar' ? tool.nameAr : tool.name}
          description={language === 'ar' ? tool.descriptionAr : tool.description}
        />
      )}
      {content}
    </ToolLayout>
  );
}
