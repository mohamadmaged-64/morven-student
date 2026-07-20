import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { Card } from '@/components/UI/Card';
import { Badge } from '@/components/UI/Badge';
import { EmptyState } from '@/components/UI/EmptyState';
import { SearchBar } from '@/components/UI/SearchBar';
import { categories } from '@/data/categories';
import { getToolById, tools } from '@/data/tools';
type Tool = (typeof tools)[number];
import { categoryOrder } from '@/data/navigation';
import { file } from 'jszip';
import {
  Folder,
  House,
  Brain,
  FileText,
  Presentation,
  Video,
  Music,
  Image,
  QrCode,
  GraduationCap,
  HeartPulse,
  FileTextIcon,
  Zap,
  Clock,
  Star,
  Paperclip,
  FileArchive,
  FileIcon,
  Globe,
  Timer,
  Scissors,
  Inbox,
  Pill,
  ListTodo
} from 'lucide-react';
 const icon = {
               FileText,
               Brain,
               Presentation,
               Video,
               Music,
               Image,
               QrCode,
               GraduationCap,
               HeartPulse,
               Zap,
               Clock,
               Star,
               Paperclip,
               FileArchive,
               FileIcon,
               FileTextIcon,
               Globe,
               Timer,
                Scissors,
                Inbox,
                Pill
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 24 },
  },
};

const badgeVariantMap: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'danger' | 'neutral'> = {
  office: 'primary',
  ai: 'info',
  powerpoint: 'warning',
  video: 'danger',
  audio: 'neutral',
  images: 'success',
  qrcode: 'primary',
  student: 'info',
  medical: 'danger',
  engineering: 'success',
};

{/* Premium Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative rounded-[2.5rem] overflow-hidden mb-10 bg-gradient-to-br from-emerald-50 via-teal-50 to-white dark:from-emerald-900/20 dark:via-teal-900/10 dark:to-dark-bg border border-emerald-100 dark:border-emerald-800/30 shadow-sm"
      >
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-200/40 dark:bg-emerald-700/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-200/40 dark:bg-teal-700/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 px-6 py-14 md:py-20 text-center">
          <motion.h1
            className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
        >
        <div/>
          </motion.h1>
         

          {/* Glassmorphism Global Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="max-w-2xl mx-auto"
          >
            <div className="p-2 bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-gray-700/50 shadow-xl shadow-emerald-900/5 dark:shadow-black/20 transition-all duration-300 hover:shadow-2xl hover:bg-white/60 dark:hover:bg-gray-900/60 hover:shadow-emerald-900/10">
              
            </div>
          </motion.div>
        </div>
      </motion.div>

function ToolCardGrid({ items, emptyTitle, emptyHint }: { items: typeof tools; emptyTitle: string; emptyHint?: string }) {
  const navigate = useNavigate();
  const favoriteTools = useAppStore((s) => s.favoriteTools);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const addRecentTool = useAppStore((s) => s.addRecentTool);
  const language = useLanguageStore((s) => s.language);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="w-12 h-12 text-gray-400 dark:text-gray-500" />}
        title={emptyTitle}
        description={emptyHint}
      />
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
    >
      {items.map((tool) => {
        const isFav = favoriteTools.includes(tool.id);
        return (
          <motion.div key={tool.id} variants={itemVariants}>
            <Card
              hoverable
              padding="sm"
              className={`relative group h-full ${
  tool.comingSoon
    ? 'cursor-not-allowed opacity-75'
    : 'cursor-pointer'
}`}
              onClick={() => {
                if (!tool.comingSoon) {
                  addRecentTool(tool.id);
                  navigate(`/tool/${tool.id}`);
                }
              }}
            >
              <div className="flex flex-col items-center text-center gap-2 py-2">
                <div className="text-gray-700 dark:text-gray-300">
  {(() => {
   const ToolIcon = tool.icon;

return <ToolIcon className="w-8 h-8" />;
  })()}
</div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight line-clamp-2">
                  {language === 'ar' ? tool.nameAr : tool.name}
                </span>
              </div>
              <div className="absolute top-1.5 end-1.5 flex items-center gap-1">

  {tool.comingSoon && (
    <Badge
      variant="warning"
      size="sm"
    >
      {language === 'ar' ? 'قريبًا' : 'Coming Soon'}
    </Badge>
  )}

  <button
    onClick={(e) => {
      e.stopPropagation();
      toggleFavorite(tool.id);
    }}
    className="p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-dark-hover"
    aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
  >
    <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill={isFav ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    className={isFav ? 'text-amber-400' : 'text-gray-400'}
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
              </button>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function QuickAction({ icon, label, to }: { icon: React.ReactNode; label: string; to: string }) {
  const addRecentTool = useAppStore((s) => s.addRecentTool);
  return (
    <Link
      to={to}
      onClick={() => addRecentTool(to.replace('/tool/', ''))}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all duration-200 group"
    >
      <span className="text-xl group-hover:scale-110 transition-transform">{icon}</span>
      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 text-center leading-tight">
        {label}
      </span>
    </Link>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const language = useLanguageStore((s) => s.language);
  const recentToolIds = useAppStore((s) => s.recentTools);
  const favoriteToolIds = useAppStore((s) => s.favoriteTools);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const addRecentTool = useAppStore((s) => s.addRecentTool);


  const recentItems = useMemo(
    () => recentToolIds.map((id) => getToolById(id)).filter(Boolean) as typeof tools,
    [recentToolIds],
  );

  const favoriteItems = useMemo(
    () => favoriteToolIds.map((id) => getToolById(id)).filter(Boolean) as typeof tools,
    [favoriteToolIds],
  );

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

 const quickActions = [
  {
    icon: Paperclip,
    label: t('tools.office.pdfMerge.name'),
    to: '/tool/merge-pdfs',
  },
  {
    icon: Scissors,
    label: t('tools.office.pdfSplit.name'),
    to: '/tool/split-pdf',
  },
 
  {
    icon: Timer,
    label: t('tools.pomodoro'),
    to: '/tool/pomodoro',
  },
  {
    icon: QrCode,
    label: t('tools.qrcode.qrGenerate.name'),
    to: '/tool/qr-generator',
  },
  {
    icon: ListTodo,
    label: t('tools.student.taskManager.name'),
    to: '/tool/task-manager',
  },
   {
    icon: Music,
    label: t('tools.audio.speechToText.name'),
    to: '/tool/speech-to-text',
  },
  {
    icon: Music,
    label: t('tools.video.videoAudioExtractor.name'),
    to: '/tool/extract-audio-video',
  }
];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero / Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-center py-6 md:py-10"
      >
        <motion.h1
          className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
         
          <span className="block sm:inline sm:ms-2 text-primary-600 dark:text-primary-400">
            {t('dashboard.welcome')}
          </span>
        </motion.h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base max-w-lg mx-auto">
          {t('dashboard.welcomeMessage')}
        </p>
      </motion.div>

      {/* Global Search */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="max-w-xl mx-auto"
      >
        <SearchBar
          value={searchQuery}
          onChange={(v) => {
            setSearchQuery(v);
            if (v.trim()) {
              const results = tools.filter(
                (t) =>
                  t.id.includes(v.toLowerCase()) ||
                  t.name.toLowerCase().includes(v.toLowerCase()),
              );
              if (results.length > 0) {
                addRecentTool(results[0].id);
                navigate(`/tool/${results[0].id}`);
              }
            }
          }}
          placeholder={t('search.placeholder')}
          className="[&_input]:text-base [&_input]:py-3"
        />
      </motion.div>

      {/* Quick Actions */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
            {t('dashboard.quickActions')}
          </h2>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {quickActions.map((action, i) => {
            const ActionIcon = action.icon;
            
            return (
              <motion.div key={action.to} variants={itemVariants}>
                <QuickAction 
                  icon={<ActionIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />} 
                  label={action.label} 
                  to={action.to} 
                />
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* Recent Tools */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
            {t('dashboard.recentTools')}
          </h2>
        </div>
        <ToolCardGrid
          items={recentItems}
          emptyTitle={t('dashboard.noRecent')}
          emptyHint={t('dashboard.noRecentHint')}
        />
      </motion.section>

      {/* Favorite Tools */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-yellow-500" />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
            {t('dashboard.favoriteTools')}
          </h2>
        </div>
        <ToolCardGrid
          items={favoriteItems}
          emptyTitle={t('dashboard.noFavorites')}
          emptyHint={t('dashboard.noFavoritesHint')}
        />
      </motion.section>

      {/* Categories */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-2 mb-4">
          <Folder className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
            {t('dashboard.categories')}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryOrder.map((cat) => {
            const meta = categories[cat];
            const IconComponent = meta.icon;
            const catTools = tools.filter((t) => t.category === cat);
            const isExpanded = expandedCategory === cat;
            return (
              <motion.div key={cat} variants={itemVariants}>
                <Card
                  hoverable
                  padding="md"
                  className="h-full"
                  onClick={() => setExpandedCategory(isExpanded ? null : cat)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-900/30 flex items-center justify-center text-2xl shrink-0 shadow-sm">
                      <IconComponent className="w-6 h-6 text-gray-800 dark:text-gray-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                          {language === 'ar' ? meta.nameAr : meta.name}
                        </h3>
                        <Badge variant={badgeVariantMap[cat] || 'neutral'} size="sm">
                          {catTools.length}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {language === 'ar' ? meta.descriptionAr : meta.description}
                      </p>
                    </div>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`shrink-0 mt-1 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>

                  {/* Expanded tool list */}
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="mt-4 pt-3 border-t border-light-border dark:border-dark-border overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-1.5">
                        {catTools.map((tool) => { 
                         const ToolExpandedIcon = tool.icon;
                         return (
                          <Link
  key={tool.id}
  to={tool.comingSoon ? '#' : `/tool/${tool.id}`}
  onClick={(e) => {
    if (tool.comingSoon) {
      e.preventDefault();
      return;
    }
    addRecentTool(tool.id);
  }}
  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
    tool.comingSoon
      ? 'opacity-60 cursor-not-allowed'
      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-surface hover:text-gray-900 dark:hover:text-gray-200'
  }`}
>
                          
                            <span className="text-gray-500 dark:text-gray-400">
                                <ToolExpandedIcon className="w-4 h-4" />
                              </span>
                           <div className="flex items-center gap-2 min-w-0">
  <span className="truncate">
    {language === 'ar' ? tool.nameAr : tool.name}
  </span>

  {tool.comingSoon && (
    <Badge variant="warning" size="sm">
      {language === 'ar' ? 'قريبًا' : 'Coming Soon'}
    </Badge>
  )}
</div>
                          </Link>
                          );
          })}
                      </div>
                      <Link
                        to={`/category/${cat}`}
                        className="block mt-2 text-center text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 py-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors"
                      >
                        {t('nav.allTools')} →
                      </Link>
                    </motion.div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.section>
      <footer className="mt-12 border-t border-light-border dark:border-dark-border py-6">
    <p className="text-center text-sm text-gray-500 dark:text-gray-400">
      {t(
        'footer.copyright',
        '© 2026 Morven Company. All rights reserved.'
      )}
    </p>
  </footer>
    </div>
    
  );
}
