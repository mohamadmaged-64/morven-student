import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/UI';
import {
  FileText,
  CheckCircle,
  UserCheck,
  Scale,
  Globe,
  AlertTriangle,
  RefreshCw,
  Mail,
  MessageCircle,
  Calendar,
  Shield,
  Ban,
  Sparkles,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: 'easeOut' },
  }),
};

const overviewCards = [
  {
    icon: CheckCircle,
    title: 'الاستخدام المقبول',
    desc: 'استخدم مورفن بمسؤولية وأغراض مشروعة فقط.',
  },
  {
    icon: UserCheck,
    title: 'مسؤوليات المستخدم',
    desc: 'أنت مسؤول عن أفعالك والمحتوى الذي تعالجه.',
  },
  {
    icon: Globe,
    title: 'توفر الخدمة',
    desc: 'نسعى للحفاظ على توفر مورفن في جميع الأوقات.',
  },
  {
    icon: RefreshCw,
    title: 'تغييرات على هذه الشروط',
    desc: 'عند إجراء تغييرات، سيتم مراجعة تاريخ "آخر تحديث" في أعلى هذه الصفحة.',
  },
];

const termsSections = [
  {
    icon: FileText,
    title: 'قبول الشروط',
    content: 'باستخدام مورفن للطلاب ، أنت توافق على الالتزام بشروط الخدمة هذه. إذا لم توافق على أي جزء من هذه الشروط، يجب عليك عدم استخدام الخدمة. تنطبق هذه الشروط على جميع الزوار والمستخدمين للمنصة.',
  },
  {
    icon: CheckCircle,
    title: 'استخدام الخدمات',
    content: 'يقدم مورفن أدوات مجانية عبر الإنترنت للطلاب، بما في ذلك معالجة PDF ومساعدات الدراسة وأدوات العروض التقديمية وأدوات الوسائط. يمكنك استخدام هذه الأدوات لأغراض شخصية أو تعليمية أو غير تجارية. أنت توافق على عدم استخدام الخدمات لأي غرض غير قانوني، أو محاولة إعاقة أو حمل البنية التحتية، أو التحايل على أي قيود استخدام.',
  },
];

export default function TermsPage() {
  const navigate = useNavigate();

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
            <Scale className="w-3.5 h-3.5" />
            شروط الخدمة
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight leading-tight"
          >
            شروط
            <br />
            <span className="text-primary-600 dark:text-primary-400">
              الخدمة
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-base md:text-lg leading-relaxed"
          >
            يرجى قراءة شروط الخدمة هذه بعناية قبل استخدام مورفن، لأن استخدامك للخدمة يعني قبولك لهذه الشروط.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mt-6 inline-flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500"
          >
            <Calendar className="w-3.5 h-3.5" />
            آخر تحديث: يوليو 2026
          </motion.div>
        </div>
      </motion.section>

      {/* ── Terms Overview Cards ── */}
      <section className="mb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {overviewCards.map((card, i) => {
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
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1.5 text-sm">
                  {card.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {card.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Terms Sections ── */}
      <section className="mb-20 space-y-4">
        {termsSections.map((section, i) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={i}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-20px' }}
              className="rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border p-6 md:p-8 transition-colors duration-200 hover:border-primary-200 dark:hover:border-primary-800/40"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white pt-1.5">
                  {section.title}
                </h2>
              </div>
              <div className="pl-0 md:pl-14">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                  {section.content}
                </p>
              </div>
            </motion.div>
          );
        })}
      </section>
    </div>
  );
}
