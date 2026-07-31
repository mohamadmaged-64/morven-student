type GrammarHighlightProps = {
  correctedText: string;
  issues: string[];
  correctedLabel?: string;
  issuesLabel?: string;
};
function GrammarHighlight({
  correctedText,
  issues,
  correctedLabel = 'Corrected Text',
  issuesLabel = 'Issues Found',
}: GrammarHighlightProps) {


  return (
    <div className="mb-4 space-y-3">
      <div className="rounded-xl border border-light-border dark:border-dark-border bg-gray-50 dark:bg-dark-surface p-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
          {correctedLabel}
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
        {correctedText}
        </p>
      </div>
      {issues.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 p-4">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2 uppercase tracking-wide">
             {issuesLabel} ({issues.length})
          </p>
          <ul className="space-y-1">
            {issues.map((issue, i) => (
              <li key={i} className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export {GrammarHighlight};
export type {GrammarHighlightProps};