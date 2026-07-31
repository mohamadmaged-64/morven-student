type SideBySideProps = {
  leftLabel: string;
  rightLabel: string;
  leftText: string;
  rightText: string;
  rightBg?: boolean;
};
function SideBySide({
  leftLabel,
  rightLabel,
  leftText,
  rightText,
  rightBg = false,
}: SideBySideProps) {


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
      <div className="rounded-xl border border-light-border dark:border-dark-border bg-gray-50 dark:bg-dark-surface p-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
          {leftLabel}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
          {leftText}
        </p>
      </div>
      <div className={`rounded-xl border border-light-border dark:border-dark-border p-4 ${rightBg ? 'bg-primary-50 dark:bg-primary-900/10' : 'bg-gray-50 dark:bg-dark-surface'}`}>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
          {rightLabel}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
          {rightText}
        </p>
      </div>
    </div>
  );
}

export {SideBySide};
export type {SideBySideProps};