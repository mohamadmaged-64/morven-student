import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Badge } from '@/components/UI/Badge';
import { Avatar } from '@/pages/connect/Avatar';
import { listSuggestions, type AdminSuggestion } from '@/services/suggestionApi';
import { ChevronLeft, Lightbulb, RefreshCw, MessageSquareText } from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleString('ar-EG-u-nu-latn', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

export default function AdminSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<AdminSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listSuggestions();
      setSuggestions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" dir="rtl">
      <motion.div {...fadeUp}>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 mb-6 group"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:ps-1" />
          <span className="text-sm font-medium">العودة للرئيسية</span>
        </Link>
      </motion.div>

      <motion.div {...fadeUp}>
        <Card padding="lg" className="mb-6 relative overflow-hidden">
          <div className="absolute -top-10 -end-10 w-40 h-40 rounded-full bg-primary-100/40 dark:bg-primary-900/15 blur-2xl pointer-events-none" />
          <div className="relative flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary-500" />
              الاقتراحات
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="primary" icon={<MessageSquareText className="w-3 h-3" />}>
                {suggestions.length} اقتراح
              </Badge>
              <Button size="sm" variant="ghost" onClick={loadSuggestions} loading={loading} icon={<RefreshCw className="w-4 h-4" />}>
                تحديث
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {error && (
        <motion.div {...fadeUp} className="mb-4">
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        </motion.div>
      )}

      <motion.div {...fadeUp}>
        <Card padding="none" className="overflow-hidden">
          {loading && suggestions.length === 0 ? (
            <div className="min-h-[40vh] flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-16 px-4">
              <p className="text-gray-500 dark:text-gray-400">لا توجد اقتراحات بعد</p>
            </div>
          ) : (
            <ul className="divide-y divide-light-border dark:divide-dark-border">
              {suggestions.map((suggestion) => (
                <li key={suggestion.id} className="px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0 mb-3">
                    <Avatar src={suggestion.user.avatarUrl} name={suggestion.user.displayName} size="sm" />
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white truncate block">
                        {suggestion.user.displayName}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate block" dir="ltr">
                        {suggestion.user.email}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                    {suggestion.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap mb-2">
                    {suggestion.content}
                  </p>
                  {suggestion.anonymous && (
                    <Badge variant="warning" size="sm" className="mb-2">
                      اختار الإرسال بشكل متخفٍ
                    </Badge>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    تاريخ الإرسال: {formatDate(suggestion.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </motion.div>
    </div>
  );
}