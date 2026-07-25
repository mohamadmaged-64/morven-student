import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, HelpCircle, MessageCircle, ChevronRight, FileText, Brain, Shield, User, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/UI';
import { Accordion } from '@/components/UI/Accordion';
import type { AccordionItem } from '@/components/UI/Accordion';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: 'easeOut' },
  }),
};

type FaqCategory = 'all' | 'general' | 'pdf' | 'ai' | 'privacy' | 'account';

const faqCategories: { id: FaqCategory; labelEn: string; labelAr: string; icon: React.ElementType }[] = [
  { id: 'all', labelEn: 'All', labelAr: 'الكل', icon: HelpCircle },
  { id: 'general', labelEn: 'General', labelAr: 'عام', icon: HelpCircle },
  { id: 'account', labelEn: 'Account & Usage', labelAr: 'الحساب والاستخدام', icon: User },
  { id: 'privacy', labelEn: 'Privacy & Security', labelAr: 'الخصوصية والأمان', icon: Shield },
];

interface FaqItem {
  id: string;
  category: FaqCategory;
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
}

const faqData: FaqItem[] = [
  // GENERAL
  {
    id: 'gen-1', category: 'general',
    questionEn: 'What is Morven for Students?',
    questionAr: 'ما هو مورفن للطلاب؟',
    answerEn: 'Morven for Students is an all-in-one web-based toolkit designed specifically for students. It offers a wide range of tools including PDF editing, AI-powered study aids, presentation tools, video and audio utilities, and more — all accessible directly from your browser.',
    answerAr: 'مورفن للطلاب هو حقيبة أدوات شاملة تعمل على الويب ومصممة خصيصاً للطلاب. يوفر مجموعة واسعة من الأدوات بما في ذلك تحرير PDF ومساعدات الدراسة بالذكاء الاصطناعي وأدوات العروض التقديمية وأدوات الفيديو والصوت والمزيد — الكل متاح مباشرة من متصفحك.',
  },
  {
    id: 'gen-4', category: 'general',
    questionEn: 'Which languages are supported?',
    questionAr: 'أي اللغات مدعومة؟',
    answerEn: 'Morven fully supports both English and Arabic. The interface automatically adapts to your selected language, including full right-to-left (RTL) layout support for Arabic.',
    answerAr: 'يدعم مورfen بالكامل الإنجليزية والعربية. تتكيف الواجهة تلقائياً مع لغتك المختارة، بما في ذلك دعم تخطيط اليمين لليسار بالكامل للعربية.',
  },

  // ACCOUNT & USAGE
  {
    id: 'acc-1', category: 'account',
    questionEn: 'Are there any file size limits?',
    questionAr: 'هل هناك حد لحجم الملفات؟',
    answerEn: 'File size limits depend on the tool and your device\'s capabilities. Client-side tools (like PDF merge and split) are limited mainly by your browser\'s memory. Server-side tools (like Office-to-PDF) have a limit of approximately 50MB per file.',
    answerAr: 'تعتمد أحجام الملفات على الأداة وقدرات جهازك. الأدوات جانب العميل (مثل دمج وتقسيم PDF) محدودة بشكل أساسي بذاكرة متصفحك. الأدوات جانب الخادم (مثل Office إلى PDF) لها حد تقريبي 50 ميجابايت لكل ملف.',
  },
  {
    id: 'acc-2', category: 'account',
    questionEn: 'Can I use Morven on mobile devices?',
    questionAr: 'هل يمكنني استخدام مورفن على الأجهزة المحمولة؟',
    answerEn: 'Yes. Morven is fully responsive and works on smartphones and tablets. However, some advanced tools may work best on a desktop or laptop due to screen size and file management requirements.',
    answerAr: 'نعم. مورfen متجاوب بالكامل ويعمل على الهواتف الذكية والأجهزة اللوحية. ومع ذلك، قد تعمل بعض الأدوات المتقدمة بشكل أفضل على سطح المكتب أو الحاسوب المحمول بسبب حجم الشاشة ومتطلبات إدارة الملفات.',
  },
  {
    id: 'acc-3', category: 'account',
    questionEn: 'How often are new tools added?',
    questionAr: 'كم مرة تُضاف أدوات جديدة؟',
    answerEn: 'We regularly add new tools and features based on student feedback and requests. Tools marked as "Coming Soon" are actively in development. Stay tuned by checking the site periodically for updates.',
    answerAr: 'نضيف أدوات وميزات جديدة بانتظام بناءً على ملاحظات وطلبات الطلاب. الأدوات المميزة بـ "قريبًا" قيد التطوير النشط. تابعنا بالتحقق من الموقع بشكل دوري للحصول على التحديثات.',
  },
    // PRIVACY & SECURITY
  {
    id: 'priv-1', category: 'privacy',
    questionEn: 'Is my data safe when using Morven?',
    questionAr: 'هل بياناتي آمنة عند استخدام مورفن؟',
    answerEn: 'Absolutely. Morven is built with a privacy-first philosophy. Most tools process your files entirely in your browser using client-side technology, meaning your data never touches our servers. For tools that require server processing (like Office-to-PDF), files are deleted immediately after processing.',
    answerAr: 'بالتأكيد. مورفن مبني بفلسفة الخصوصية أولاً. معظم الأدوات تعالج ملفاتك بالكامل في متصفحك باستخدام تقنية جانب العميل، مما يعني أن بياناتك لا تصل إلى خوادمنا. للأدوات التي تتطلب معالجة على الخادم، تُحذف الملفات فوراً بعد المعالجة.',
  },
];

export default function FAQPage() {
  const navigate = useNavigate();
  const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
  const isAr = lang === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FaqCategory>('all');

  const filteredFaqs = useMemo(() => {
    let result = faqData;

    if (activeCategory !== 'all') {
      result = result.filter((item) => item.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.questionEn.toLowerCase().includes(q) ||
          item.questionAr.includes(q) ||
          item.answerEn.toLowerCase().includes(q) ||
          item.answerAr.includes(q),
      );
    }

    return result;
  }, [activeCategory, searchQuery]);

  const accordionItems: AccordionItem[] = filteredFaqs.map((faq) => ({
    id: faq.id,
    title: isAr ? faq.questionAr : faq.questionEn,
    content: isAr ? faq.answerAr : faq.answerEn,
  }));

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* ── Hero ── */}
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative rounded-3xl overflow-hidden mb-12 bg-gradient-to-br from-emerald-50 via-teal-50 to-white dark:from-emerald-900/20 dark:via-teal-900/10 dark:to-dark-bg border border-emerald-100 dark:border-emerald-800/30"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-200/40 dark:bg-emerald-700/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-200/40 dark:bg-teal-700/20 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 px-6 py-14 md:py-20 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-6"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {isAr ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight leading-tight"
          >
            {isAr ? 'كيف يمكننا' : 'How Can We'}
            <br />
            <span className="text-primary-600 dark:text-primary-400">
              {isAr ? 'مساعدتك؟' : 'Help You?'}
            </span>
          </motion.h1>
        
     
        </div>
      </motion.section>

      {/* ── Category Pills ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mb-10"
      >
        <div className="flex flex-wrap justify-center gap-2">
          {faqCategories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={[
                  'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20 dark:shadow-primary-700/30'
                    : 'bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-gray-600 dark:text-gray-400 hover:border-primary-300 dark:hover:border-primary-700 hover:text-primary-600 dark:hover:text-primary-400',
                ].join(' ')}
              >
                <Icon className="w-4 h-4" />
                {isAr ? cat.labelAr : cat.labelEn}
              </button>
            );
          })}
        </div>
      </motion.section>

      {/* ── FAQ Accordion ── */}
      <section className="mb-16 max-w-3xl mx-auto">
        {filteredFaqs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <HelpCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
              {isAr ? 'لم يتم العثور على نتائج' : 'No results found'}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              {isAr
                ? 'جرّب البحث بكلمات مختلفة أو تصفح الفئات.'
                : 'Try searching with different words or browse categories.'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Accordion items={accordionItems} multiple />
          </motion.div>
        )}
      </section>

      {/* ── Final CTA ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border p-8 md:p-12 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mx-auto mb-5">
          <MessageCircle className="w-7 h-7 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
          {isAr ? 'لم تجد إجابة؟' : "Didn't Find Your Answer?"}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8 text-sm md:text-base leading-relaxed">
          {isAr
            ? 'فريقنا جاهز لمساعدتك. تواصل معنا وسنرد في أقرب وقت ممكن.'
            : 'Our team is ready to help. Reach out to us and we will respond as soon as possible.'}
        </p>
        <Button
          onClick={() => navigate('/contact')}
          variant="primary"
          size="lg"
          icon={<ChevronRight className={`w-5 h-5 ${isAr ? 'rotate-180' : ''}`} />}
        >
          {isAr ? 'تواصل معنا' : 'Contact Us'}
        </Button>
      </motion.section>
    </div>
  );
}
