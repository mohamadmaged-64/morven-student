import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, HelpCircle, MessageCircle, ChevronRight, FileText, Shield, User, X } from 'lucide-react';
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

type FaqCategory = 'all' | 'general' | 'pdf' | 'privacy' | 'account';

const faqCategories: { id: FaqCategory; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'الكل', icon: HelpCircle },
  { id: 'general', label: 'عام', icon: HelpCircle },
  { id: 'account', label: 'الحساب والاستخدام', icon: User },
];

interface FaqItem {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
}

const faqData: FaqItem[] = [
  // GENERAL
  {
    id: 'gen-1', category: 'general',
    question: 'ما هو مورفن للطلاب؟',
    answer: 'مورفن للطلاب هو حقيبة أدوات شاملة تعمل على الويب ومصممة خصيصاً للطلاب. يوفر مجموعة واسعة من الأدوات بما في ذلك تحرير PDF ومساعدات الدراسة وأدوات العروض التقديمية وأدوات الفيديو والصوت والمزيد — الكل متاح مباشرة من متصفحك.',
  },
  {
    id: 'gen-4', category: 'general',
    question: 'ما اللغة المدعومة؟',
    answer: 'مورفن متوفر باللغة العربية بالكامل، مع دعم كامل لتخطيط اليمين لليسار (RTL) في جميع صفحات الموقع.',
  },

  // ACCOUNT & USAGE
  {
    id: 'acc-1', category: 'account',
    question: 'هل هناك حد لحجم الملفات؟',
    answer: 'تعتمد أحجام الملفات على الأداة وقدرات جهازك. الأدوات جانب العميل (مثل دمج وتقسيم PDF) محدودة بشكل أساسي بذاكرة متصفحك. الأدوات جانب الخادم (مثل Office إلى PDF) لها حد تقريبي 100 ميجابايت لكل ملف.',
  },
  {
    id: 'acc-2', category: 'account',
    question: 'هل يمكنني استخدام مورفن على الأجهزة المحمولة؟',
    answer: 'نعم. مورفن متجاوب بالكامل ويعمل على الهواتف الذكية والأجهزة اللوحية. ومع ذلك، قد تعمل بعض الأدوات المتقدمة بشكل أفضل على سطح المكتب أو الحاسوب المحمول بسبب حجم الشاشة ومتطلبات إدارة الملفات.',
  },
  {
    id: 'acc-3', category: 'account',
    question: 'كم مرة تُضاف أدوات جديدة؟',
    answer: 'نضيف أدوات وميزات جديدة بانتظام بناءً على ملاحظات وطلبات الطلاب. الأدوات المميزة بـ "قريبًا" قيد التطوير النشط. تابعنا بالتحقق من الموقع بشكل دوري للحصول على التحديثات.',
  },

];

export default function FAQPage() {
  const navigate = useNavigate();

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
          item.question.includes(q) ||
          item.answer.includes(q),
      );
    }

    return result;
  }, [activeCategory, searchQuery]);

  const accordionItems: AccordionItem[] = filteredFaqs.map((faq) => ({
    id: faq.id,
    title: faq.question,
    content: faq.answer,
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
            الأسئلة الشائعة
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight leading-tight"
          >
            كيف يمكننا
            <br />
            <span className="text-primary-600 dark:text-primary-400">
              مساعدتك؟
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
                {cat.label}
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
              لم يتم العثور على نتائج
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              جرّب البحث بكلمات مختلفة أو تصفح الفئات.
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
          لم تجد إجابة؟
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8 text-sm md:text-base leading-relaxed">
          فريقنا جاهز لمساعدتك. تواصل معنا وسنرد في أقرب وقت ممكن.
        </p>
        <Button
          onClick={() => navigate('/contact')}
          variant="primary"
          size="lg"
          icon={<ChevronRight className={`w-5 h-5 rotate-180`} />}
        >
          تواصل معنا
        </Button>
      </motion.section>
    </div>
  );
}
