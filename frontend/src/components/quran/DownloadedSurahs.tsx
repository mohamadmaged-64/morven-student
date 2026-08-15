import { useMemo } from 'react';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useQuranStore } from '@/store/quranStore';
import { Card } from '@/components/UI/Card';
import { Download, Trash2, HardDrive } from 'lucide-react';

function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 100 ? 0 : 1)} ${units[i]}`;
}

export function DownloadedSurahs() {
  const { language } = useLanguageStore();
  const downloads = useQuranStore((s) => s.downloads);
  const removeDownload = useQuranStore((s) => s.removeDownload);

  const items = useMemo(
    () =>
      Object.values(downloads)
        .filter((d) => d.status === 'done')
        .sort((a, b) => b.surahId - a.surahId),
    [downloads],
  );

  const totalSize = useMemo(
    () => items.reduce((n, d) => n + d.size, 0),
    [items],
  );

  return (
    <Card className="overflow-hidden">
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                {language === 'ar'
                  ? 'التلاوات المحملة'
                  : 'Downloaded Recitations'}
              </h3>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {language === 'ar'
                  ? 'تُخزَّن في متصفحك ويمكن تشغيلها بدون إنترنت'
                  : 'Stored in your browser and playable offline'}
              </p>
            </div>
          </div>

          {items.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-xl px-3 py-2">
              <HardDrive className="w-4 h-4" />
              {formatSize(totalSize)}
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Download className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500 max-w-md">
              {language === 'ar'
                ? 'لا توجد تلاوات محملة بعد. اختر قارئاً وسورة ثم اضغط "تحميل للاستماع بدون إنترنت" لتشغيلها لاحقاً بدون اتصال.'
                : 'Nothing downloaded yet. Pick a reciter and surah, then press "Download for offline listening" to play it later without a connection.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto overscroll-contain">
            {items.map((d) => (
              <div
                key={d.key}
                className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 dark:text-gray-100 truncate">
                    {language === 'ar' ? d.surahNameAr : d.surahName}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {language === 'ar' ? d.reciterNameAr : d.reciterName} ·{' '}
                    {formatSize(d.size)}
                  </p>
                </div>
                <button
                  onClick={() => void removeDownload(d.key)}
                  aria-label={
                    language === 'ar' ? 'حذف' : 'Delete download'
                  }
                  className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-all shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
