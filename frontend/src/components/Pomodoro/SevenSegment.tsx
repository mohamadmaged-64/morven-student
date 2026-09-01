import { useMemo } from 'react';

// Legacy pure-CSS 7-segment digit used by the SevenSegmentDigit test/export.
//
// The main time display (SegmentTimeDisplay) renders plain DSEG7 digits
// (MM:SS, or HH:MM:SS once the value reaches an hour) with no card boxes, no
// borders, and no flip animation — the numbers simply update normally as the
// timer ticks. It is a pure presentation layer over the shared Pomodoro timer
// seconds — it never restarts/resets/pauses/resumes the timer, and derives
// everything from the passed-in `seconds`.

const SEGMENT_MAP: Record<string, number[]> = {
  '0': [1, 1, 1, 1, 1, 1, 0],
  '1': [0, 1, 1, 0, 0, 0, 0],
  '2': [1, 1, 0, 1, 1, 0, 1],
  '3': [1, 1, 1, 1, 0, 0, 1],
  '4': [0, 1, 1, 0, 0, 1, 1],
  '5': [1, 0, 1, 1, 0, 1, 1],
  '6': [1, 0, 1, 1, 1, 1, 1],
  '7': [1, 1, 1, 0, 0, 0, 0],
  '8': [1, 1, 1, 1, 1, 1, 1],
  '9': [1, 1, 1, 1, 0, 1, 1],
};

interface SevenSegmentDigitProps {
  value: number;
  size?: number;
  color?: string;
  dimColor?: string;
}

export function SevenSegmentDigit({
  value,
  size = 64,
  color = '#ff4d4d',
  dimColor = 'rgba(255,77,77,0.08)',
}: SevenSegmentDigitProps) {
  const digits = Math.min(9, Math.max(0, Math.floor(value)));
  const [a, b, c, d, e, f, g] = SEGMENT_MAP[String(digits)];

  const segStyle = useMemo(
    () => (on: number): React.CSSProperties => {
      const base: React.CSSProperties = {
        position: 'absolute',
        background: on ? color : dimColor,
        boxShadow: on ? `0 0 ${Math.round(size / 6)}px ${color}` : 'none',
        transition: 'background 0.12s linear, box-shadow 0.12s linear',
        borderRadius: Math.max(2, Math.round(size / 20)),
      };
      return base;
    },
    [color, dimColor, size],
  );

  // Geometry (in units where the digit box is roughly 1 unit wide).
  const thin = Math.max(2, Math.round(size / 10));
  const thick = Math.max(2, Math.round(size / 7));
  const x0 = thick * 0.25;
  const xMid = size / 2;
  const yTop = thick * 0.4;
  const yMid = size / 2 - thick / 2;
  const yBot = size - thick * 2.4;
  const segLen = size - (thick * 1.25);

  return (
    <div
      className="relative select-none"
      style={{ width: size, height: size * 1.9, flexShrink: 0 }}
      aria-hidden="true"
      data-digit={digits}
    >
      {/* a: top horizontal */}
      <div
        style={{
          ...segStyle(a),
          left: x0,
          top: yTop,
          width: segLen,
          height: thick,
        }}
      />
      {/* g: middle horizontal */}
      <div
        style={{
          ...segStyle(g),
          left: x0,
          top: yMid,
          width: segLen,
          height: thick,
        }}
      />
      {/* d: bottom horizontal */}
      <div
        style={{
          ...segStyle(d),
          left: x0,
          top: yBot,
          width: segLen,
          height: thick,
        }}
      />
      {/* f: top-left vertical */}
      <div
        style={{
          ...segStyle(f),
          left: x0,
          top: yTop + thick / 2,
          width: thick,
          height: yMid - yTop - thick / 2,
        }}
      />
      {/* b: top-right vertical */}
      <div
        style={{
          ...segStyle(b),
          right: x0,
          top: yTop + thick / 2,
          width: thick,
          height: yMid - yTop - thick / 2,
        }}
      />
      {/* e: bottom-left vertical */}
      <div
        style={{
          ...segStyle(e),
          left: x0,
          top: yMid + thick / 2,
          width: thick,
          height: yBot - yMid - thick / 2,
        }}
      />
      {/* c: bottom-right vertical */}
      <div
        style={{
          ...segStyle(c),
          right: x0,
          top: yMid + thick / 2,
          width: thick,
          height: yBot - yMid - thick / 2,
        }}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// DIGITAL presentation — plain DSEG7 digits
// -----------------------------------------------------------------------------

interface FlipDigitProps {
  value: number;
}

/**
 * A single digit with no card box and no special motion. It reads the value
 * straight from `value` and renders it in the DSEG7 font, so the numbers just
 * update normally when the timer ticks.
 */
function FlipDigit({ value }: FlipDigitProps) {
  return (
    <span className="mflip-digit" data-flipcard={value}>
      {Math.min(9, Math.max(0, Math.floor(value)))}
    </span>
  );
}

interface SegmentTimeDisplayProps {
  seconds: number;
  size?: number;
  color?: string;
  dimColor?: string;
}

/**
 * Renders the time as plain DSEG7 digits (no cards, no borders, no flip).
 * MM:SS normally; HH:MM:SS the moment the value reaches one hour (Count Up).
 *
 * The value is derived purely from the passed-in `seconds` — it holds no
 * timer state. The numbers simply update normally when the timer ticks.
 *
 * The parent may override the rendered size responsively by setting the
 * `--morven-flip-size` CSS custom property (e.g. for fullscreen).
 */
export function SegmentTimeDisplay({ seconds, size = 60, color, dimColor }: SegmentTimeDisplayProps) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  const c = color ?? '#ffffff';
  void dimColor;

  return (
    <div
      dir="ltr"
      className="mflip"
      aria-hidden="true"
      style={{
        ['--mflip-w' as string]: `var(--morven-flip-size, ${size}px)`,
        ['--mflip-fg' as string]: c,
      }}
    >
      <div className="mflip-row">
        {h > 0 && (
          <>
            <FlipDigit value={Math.floor(h / 10)} />
            <FlipDigit value={h % 10} />
            <div className="mflip-colon">:</div>
          </>
        )}
        <FlipDigit value={Math.floor(mm / 10)} />
        <FlipDigit value={mm % 10} />
        <div className="mflip-colon">:</div>
        <FlipDigit value={Math.floor(ss / 10)} />
        <FlipDigit value={ss % 10} />
      </div>
    </div>
  );
}
