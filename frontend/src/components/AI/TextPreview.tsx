type TextPreviewProps = {
  title?: string;
  text: string;
  maxHeight?: string;
};

function TextPreview({
  title = 'Result',
  text,
  maxHeight = '16rem',
}: TextPreviewProps) {
  return (
    <div className="mb-4 max-h-64 overflow-auto rounded-xl border border-light-border dark:border-dark-border bg-gray-50 dark:bg-dark-surface p-4">
      {title && (
        <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          {title}
        </h3>
      )}

      <pre
        className="whitespace-pre-wrap font-mono text-sm text-gray-700 dark:text-gray-300"
        style={{ maxHeight }}
      >
        {text}
      </pre>
    </div>
  );
}

export { TextPreview };
export type { TextPreviewProps };