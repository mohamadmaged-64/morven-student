import { motion } from 'framer-motion';
import { Button } from '@/components/UI';
import { ArrowRight, ChevronRight, Wrench, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { categoryOrder, categories, getToolsByCategory } from '@/data/tools';
import type { ToolCategory } from '@/types';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: 'easeOut' },
  }),
};

const categoryDescriptions: Record<ToolCategory, { en: string; ar: string }> = {
  general: { en: 'Pomodoro timer, task manager, exam countdown, and productivity aids.', ar: 'مدير المهام ومنشئ الملاحظات ومؤقت البومودورو والمزيد' },
  medical: { en: 'Medical summarizers, flashcards, drug references, and lab values for students.', ar: 'ملخصات طبية وبطاقات تعليمية ومراجع الأدوية وقيم المختبر للطلاب.' },
  engineering: { en: 'Engineering calculators, diagrams, and design tools coming soon.', ar: 'حاسبات هندسية ورسومات وأدوات تصميم قريباً.' },
  pdf: { en: 'Convert, merge, split, compress, and manage your PDF documents with ease.', ar: 'تحويل ودمج وتقسيم وضغط وإدارة مستندات PDF بسهولة.' },
  powerpoint: { en: 'Create, edit, convert, and enhance PowerPoint presentations effortlessly.', ar: 'إنشاء وتحرير وتحويل وتحسين عروض PowerPoint التقديمية بسهولة.' },
  video: { en: 'Compress, convert, and extract audio from video files in seconds.', ar: 'ضغط وتحويل واستخراج الصوت من ملفات الفيديو في ثوانٍ.' },
  images: { en: 'Remove backgrounds, rotate, blur, and convert images with a click.', ar: 'إزالة الخلفيات وتدوير وتغيير الحجم وتحويل الصور بنقرة واحدة.' },
  audio: { en: 'Convert audio formats and transcribe speech to text accurately.', ar: 'تحويل صيغ الصوت ونسخ الصوت إلى نص بدقة.' },
  qrcode: { en: 'Generate QR codes for URLs, text, and any data you need instantly.', ar: 'إنشاء رموز QR للروابط والنصوص وأي بيانات تحتاجها فوراً.' },
 };

export default function ToolsPage() {
  const navigate = useNavigate();
  const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
  const isAr = lang === 'ar';

  const activeCategories = categoryOrder.filter((cat) => {
    const catTools = getToolsByCategory(cat);
    return catTools.length > 0;
  });

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* ── Hero ── */}
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative rounded-3xl overflow-hidden mb-16 bg-gradient-to-br from-emerald-50 via-teal-50 to-white dark:from-emerald-900/20 dark:via-teal-900/10 dark:to-dark-bg border border-emerald-100 dark:border-emerald-800/30"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-200/40 dark:bg-emerald-700/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-200/40 dark:bg-teal-700/20 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 px-6 py-16 md:py-24 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-6"
          >
            <Wrench className="w-3.5 h-3.5" />
            {isAr ? 'جميع أدواتنا' : 'All Our Tools'}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight leading-tight"
          >
            {isAr ? 'استكشف' : 'Explore Our'}
            <br />
            <span className="text-primary-600 dark:text-primary-400">
              {isAr ? 'جميع الأدوات' : 'Complete Toolkit'}
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-8 text-base md:text-lg leading-relaxed"
          >
            {isAr
              ? 'مورفن للطلاب يوفر مجموعة شاملة من الأدوات المصممة لمساعدتك على الدراسة بكفاءة وسرعة.'
              : 'Morven for Students provides a comprehensive toolkit designed to help you study efficiently and fastly.'}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            <Button
              as="link"
              to="/features"
              variant="primary"
              size="lg"
              icon={<ArrowRight className="w-5 h-5" />}
              iconRight={undefined}
            >
              {isAr ? 'اكتشف الميزات' : 'Discover Features'}
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Category Cards Grid ── */}
      <section className="mb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            {isAr ? 'هل تريد شرح مفصل للأدوات؟' : 'Do you need a detailed explanation of the tools?'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
            {isAr
              ? 'اختر فئة لمعرفة التفاصيل '
              : 'Choose a category to read the details'}
          </p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeCategories.map((cat, i) => {
            const meta = categories[cat];
            const desc = categoryDescriptions[cat];
            const catTools = getToolsByCategory(cat);
            const Icon = meta.icon;
            const toolCount = catTools.length;
            return (
              <motion.div
                key={cat}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-20px' }}
                onClick={() => navigate(`/our-tools/${cat}`)}
                className="group cursor-pointer rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border p-6 transition-all duration-300 hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-800/50 hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                    {toolCount} {isAr ? 'أدوات' : 'tools'}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-base">
                  {isAr ? meta.nameAr : meta.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                  {isAr ? desc.ar : desc.en}
                </p>
                <div className="flex items-center text-primary-600 dark:text-primary-400 text-sm font-medium group-hover:gap-2 transition-all duration-300">
                  {isAr ? 'استكشف' : 'Explore'}
                  <ChevronRight className={`w-4 h-4 ${isAr ? 'mr-1 rotate-180' : 'ml-1'} transition-transform duration-300 group-hover:translate-x-1`} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
