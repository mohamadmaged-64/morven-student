import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/UI';
import {
  Shield,
  Lock,
  Eye,
  Trash2,
  Server,
  FileCheck,
  Upload,
  Cog,
  CheckCircle2,
  ChevronRight,
  Globe,
  MessageCircle,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: 'easeOut' },
  }),
};

const securityFeatures = [
  {
    icon: Lock,
    title: 'خصوصية من طرف لطرف',
    desc: 'جميع معالجات الملفات تتم محلياً في متصفحك. لا تُرسل بياناتك إلى خوادم خارجية أبداً، مما يضمن خصوصية تامة من البداية للنهاية.',
  },
  {
    icon: Server,
    title: 'معالجة آمنة على الخادم',
    desc: 'عندما تتطلب المعالجة الخادم (مثل تحويل Office إلى PDF)، تُشفّر الملفات أثناء النقل وتُحذف تلقائياً خلال ثوانٍ من المعالجة.',
  },
  {
    icon: Trash2,
    title: 'إزالة الملفات تلقائياً',
    desc: 'أي ملف يُرفع مؤقتاً إلى خوادمنا يُحذف بشكل دائم وغير قابل للاستعادة فور اكتمال التحويل أو المعالجة.',
  },
];

const processSteps = [
  { icon: Upload, title: 'رفع', desc: 'اختر ملفك' },
  { icon: Cog, title: 'معالجة', desc: 'معالجة آمنة' },
  { icon: FileCheck, title: 'النتيجة', desc: 'تحميل النتيجة' },
  { icon: Trash2, title: 'حذف تلقائي', desc: 'الملف محذوف' },
];

const commitments = [
  'تتم معالجة الملفات محلياً عند الإمكان',
  'لا تُباع بيانات المستخدم أو تُشارك مع أطراف ثالثة أبداً',
  'تُحذف الملفات المؤقتة خلال ثوانٍ',
  'الخصوصية هي الافتراضي — ليست خياراً',
];

export default function SecurityPage() {
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
            <Shield className="w-3.5 h-3.5" />
            أمان وخصوصية
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight leading-tight"
          >
            بياناتك آمنة
            <br />
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-base md:text-lg leading-relaxed"
          >
            نحمي خصوصيتك ببنية أمنية مصممة من الأساس، ملفاتك لا تغادر جهازك أبداً.
          </motion.p>
        </div>
      </motion.section>

      {/* ── Security Features Grid ── */}
      <section className="mb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            كيف نحمي بياناتك
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
            طبقات حماية متعددة لضمان خصوصيتك التامة.
          </p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {securityFeatures.map((feature, i) => {
            const Icon = feature.icon;
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
                <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-base">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Security Process ── */}
      <section className="mb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            كيف يعمل
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
            عملية بسيطة وآمنة في أربع خطوات.
          </p>
        </motion.div>

        {/* Desktop process */}
        <div className="hidden md:flex items-start justify-center gap-0">
          {processSteps.map((step, i) => {
            const Icon = step.icon;
            const isLast = i === processSteps.length - 1;
            return (
              <motion.div
                key={i}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-20px' }}
                className="flex items-start"
              >
                <div className="flex flex-col items-center text-center w-40">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 flex items-center justify-center shadow-lg shadow-primary-600/20 dark:shadow-primary-700/30 mb-4">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {step.desc}
                  </div>
                </div>
                {!isLast && (
                  <div className="flex items-center pt-8 px-2">
                    <div className="w-12 h-0.5 bg-gradient-to-r from-primary-300 to-primary-200 dark:from-primary-700 dark:to-primary-800 rounded-full" />
                    <ChevronRight className="w-4 h-4 text-primary-300 dark:text-primary-700 -ms-1 shrink-0" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Mobile process */}
        <div className="md:hidden space-y-0">
          {processSteps.map((step, i) => {
            const Icon = step.icon;
            const isLast = i === processSteps.length - 1;
            return (
              <motion.div
                key={i}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-20px' }}
                className="flex items-start gap-4"
              >
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 flex items-center justify-center shadow-md shadow-primary-600/20 shrink-0">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  {!isLast && (
                    <div className="w-0.5 h-8 bg-gradient-to-b from-primary-300 to-primary-200 dark:from-primary-700 dark:to-primary-800 rounded-full my-1" />
                  )}
                </div>
                <div className="pt-2 pb-6">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {step.desc}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Security Commitments ── */}
      <section className="mb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            التزامنا الأمني
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
            المبادئ التي نعمل بها لحماية بياناتك.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-900/10 dark:via-dark-card dark:to-teal-900/10 border border-emerald-100 dark:border-emerald-800/30 p-8 md:p-10"
        >
          <div className="space-y-4">
            {commitments.map((item, i) => (
              <motion.div
                key={i}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-10px' }}
                className="flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {item}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>
    </div>
  );
}
