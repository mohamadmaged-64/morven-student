import { Sparkles } from 'lucide-react';

type EmptyResultProps = {
  message?: string;
};

function EmptyResult({
  message = 'Your result will appear here.',
}: EmptyResultProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/20">
        <Sparkles className="h-8 w-8 text-primary-400 dark:text-primary-500" />
      </div>

      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {message}
      </p>
    </div>
  );
}

export { EmptyResult };
export type { EmptyResultProps };