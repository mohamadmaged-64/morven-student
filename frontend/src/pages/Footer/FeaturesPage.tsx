import { motion } from 'framer-motion';
import { Button } from '@/components/UI';
import {
  FileText,
  Presentation,
  Video,
  Music,
  QrCode,
  GraduationCap,
  HeartPulse,
  Globe,
  ArrowRight,
  Zap,
  Lock,
  Sparkles,
  Cog,
  Image,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';


const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: 'easeOut' },
  }),
};

const featureCards = [
  { icon: GraduationCap, titleEn: 'General Tools', titleAr: 'أدوات عامة', descEn: 'Pomodoro timer, task manager, exam countdown, and productivity aids.', descAr: 'مدير المهام ومنشئ الملاحظات ومؤقت البومودورو والمزيد.' },
  { icon: HeartPulse, titleEn: 'Medical Section', titleAr: 'القسم الطبي', descEn: 'Medical summarizers, flashcards, drug references, and lab values.', descAr: 'ملخصات طبية وبطاقات تعليمية ومراجع الأدوية وقيم المختبر.' },
   { icon: Cog, titleEn: 'Engineering Section', titleAr: 'القسم الهندسي', descEn: 'Computer enguneering tools and more', descAr: 'أدوات هندسة الحاسوب والمزيد' },
  { icon: FileText, titleEn: 'PDF Tools', titleAr: 'أدوات ال PDF', descEn: 'Convert, merge, split, compress, and edit PDF documents entirely in your browser.', descAr: 'تحويل ودمج وتقسيم وضغط وتحرير مستندات PDF بالكامل في متصفحك.' },
  { icon: Presentation, titleEn: 'PowerPoint', titleAr: 'أدوات ال PowerPoint', descEn: 'Create, edit, convert, and enhance PowerPoint presentations with ease.', descAr: 'إنشاء وتحرير وتحويل وتحسين عروض PowerPoint التقديمية بسهولة.' },
  { icon: Video, titleEn: 'Video Tools', titleAr: 'أدوات الفيديو', descEn: 'Compress, convert, and extract audio and more', descAr: 'ضغط وتحويل واستخراج الصوت والمزيد' },
  { icon: Image, titleEn: 'Images Tools', titleAr: 'أدوات الصور', descEn: 'Rotate, blur, convert images and more', descAr: 'تدوير وتشميع وتحويل الصور، والمزيد'},
  { icon: Music, titleEn: 'Audio Tools', titleAr: 'أدوات الصوت', descEn: 'Convert audio formats and transcribe speech to text effortlessly.', descAr: 'تحويل صيغ الصوت ونسخ الصوت إلى نص بسهولة.' },
  { icon: QrCode, titleEn: 'QR Code', titleAr: 'رمز QR', descEn: 'Generate QR codes for URLs, text, and any data you need.', descAr: 'إنشاء رموز QR للروابط والنصوص وأي بيانات تحتاجها.' },
];

const whyChooseItems = [
  { icon: Lock, titleEn: 'Privacy First', titleAr: 'الخصوصية أولاً', descEn: 'All processing happens locally in your browser. Your files never leave your device.', descAr: 'جميع المعالجات تتم محلياً في متصفحك. ملفاتك لا تغادر جهازك أبداً.' },
  { icon: Zap, titleEn: 'Lightning Fast', titleAr: 'سرعة البرق', descEn: 'No uploads, no waiting. Get instant results with client-side processing.', descAr: 'لا رفع، لا انتظار. احصل على نتائج فورية مع المعالجة المحلية.' },
  { icon: Globe, titleEn: 'Bilingual', titleAr: 'ثنائي اللغة', descEn: 'Full support for both English and Arabic with a seamless RTL experience.', descAr: 'دعم كامل للإنجليزية والعربية مع تجربة سلسة من اليمين لليسار.' },
  { icon: Sparkles, titleEn: 'Always Improving', titleAr: 'في تطور مستمر', descEn: 'New tools and features are added regularly based on student feedback.', descAr: 'تُضاف أدوات وميزات جديدة بانتظام بناءً على ملاحظات الطلاب.' },
];

const stats = [
  { value: '10+', labelEn: 'Tool Categories', labelAr: 'فئة أدوات' },
  { value: '70+', labelEn: 'Tools', labelAr: 'أداة' },
  { value: '2', labelEn: 'Languages', labelAr: 'لغة' },
  { value: '100%', labelEn: ' Privacy', labelAr: 'خصوصية' },
];

export default function FeaturesPage() {
  const { t } = useTranslation();
  const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
  const isAr = lang === 'ar';

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
            <Sparkles className="w-3.5 h-3.5" />
            {isAr ? 'ادوات طلابية متقدمة' : 'Advanced Student Tools'}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight leading-tight"
          >
            {isAr ? 'ادرس بذكاء' : 'Study Smarter,'}
            <br />
            <span className="text-primary-600 dark:text-primary-400">
              {isAr ? 'وليس بجهد' : 'Not Harder'}
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-8 text-base md:text-lg leading-relaxed"
          >
            {isAr
              ? 'مورفن للطلاب هو حقيبة أدوات شاملة مصممة لمساعدتك على الدراسة بذكاء. استكشف أدواتنا القوية أدناه.'
              : 'Morven for Students is an all-in-one toolkit designed to help you study smarter. Explore our powerful features below.'}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            <Button as="link" to="/tools" variant="primary" size="lg" icon={<ArrowRight className="w-5 h-5" />} iconRight={undefined}>
              {isAr ? 'استكشف الأدوات' : 'Explore Tools'}
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Feature Cards Grid ── */}
      <section className="mb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            {isAr ? 'كل ما تحتاجه في مكان واحد' : 'Everything You Need, In One Place'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
            {isAr
              ? 'أدوات متنوعة تغطي احتياجاتك الدراسية من PDF إلى PowerPoint.'
              : 'A diverse set of tools covering your study needs from PDF to PowerPoint.'}
          </p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featureCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={i}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-20px' }}
                className="group rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border p-6 transition-all duration-300 hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-800/50 hover:-translate-y-1"
              >
                <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-5.5 h-5.5 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
                  {isAr ? card.titleAr : card.titleEn}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {isAr ? card.descAr : card.descEn}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Why Choose Morven ── */}
      <section className="mb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            {isAr ? 'لماذا تختار مورفن؟' : 'Why Choose Morven?'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
            {isAr
              ? 'مبنية للطلاب، بواسطة طلاب.'
              : 'Built for students, by students.'}
          </p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {whyChooseItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={i}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-20px' }}
                className="flex items-start gap-4 rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border p-6 transition-colors duration-200 hover:border-primary-200 dark:hover:border-primary-800/40"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                    {isAr ? item.titleAr : item.titleEn}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {isAr ? item.descAr : item.descEn}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Stats ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5 }}
        className="mb-20 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-800 p-8 md:p-12"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, i) => (
            <div key={i}>
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-primary-100">{isAr ? stat.labelAr : stat.labelEn}</div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── Final CTA ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border p-8 md:p-12 text-center"
      >
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
          {isAr ? 'جاهز للبدء؟' : 'Ready to Get Started?'}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8 text-sm md:text-base">
          {isAr
            ? 'ابدأ باستخدام أدواتنا الآن واحصل على أفضل تجربة دراسية.'
            : 'Start using our tools now and get the best study experience.'}
        </p>
        <Button as="link" to="/tools" variant="primary" size="lg" icon={<ArrowRight className="w-5 h-5" />} iconRight={undefined}>
          {isAr ? 'استكشف الأدوات' : 'Explore Tools'}
        </Button>
      </motion.section>
    </div>
  );
}
