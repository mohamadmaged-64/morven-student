import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Mail,
  HelpCircle,
  Bug,
  Lightbulb,
  Send,
  CheckCircle2,
  MessageCircle,
  ArrowRight,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: 'easeOut' },
  }),
};

const processSteps = [
  { icon: Send, title: 'أرسل الرسالة', desc: 'املأ النموذج وأرسله.' },
  { icon: CheckCircle2, title: 'المراجعة', desc: 'فريقنا يراجع رسالتك.' },
  { icon: MessageCircle, title: 'الرد', desc: 'نرد عليك في أقرب وقت.' },
];

const subjects = [
  { value: 'general', label: 'سؤال عام' },
  { value: 'support', label: 'دعم فني' },
  { value: 'bug', label: 'تقرير خطأ' },
  { value: 'suggestion', label: 'اقتراح ميزة' },
  { value: 'other', label: 'رسالة شكر' },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', category: 'general', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

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
            <MessageCircle className="w-3.5 h-3.5" />
            تواصل معنا
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight leading-tight"
          >
            نحن هنا
            <br />
            <span className="text-primary-600 dark:text-primary-400">
              لمساعدتك
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-base md:text-lg leading-relaxed"
          >
            لديك سؤال أو اقتراح أو مشكلة؟ أرسل لنا رسالة وسنرد في أقرب وقت.
          </motion.p>
        </div>
      </motion.section>


      {/* ── Contact Form ── */}
      <section className="mb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          <div className="rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border p-6 md:p-8">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  تم إرسال رسالتك!
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                  شكراً لتواصلك معنا. سنرد في أقرب وقت ممكن.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: '', category: 'general', message: '' }); }}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
                >
                  إرسال رسالة أخرى
                </button>
              </motion.div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                    <Send className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    أرسل لنا رسالة
                  </h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        الاسم الكامل
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        placeholder="أدخل اسمك"
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        البريد الإلكتروني
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        placeholder="أدخل بريدك الإلكتروني"
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        الموضوع
                      </label>
                      <input
                        type="text"
                        name="subject"
                        value={form.subject}
                        onChange={handleChange}
                        required
                        placeholder="موضوع الرسالة"
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        الفئة
                      </label>
                      <select
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 appearance-none"
                      >
                        {subjects.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      الرسالة
                    </label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      placeholder="اكتب رسالتك هنا..."
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-700 text-white text-sm font-medium transition-colors duration-200 shadow-md shadow-primary-600/20"
                  >
                    <Send className="w-4 h-4" />
                    إرسال الرسالة
                  </button>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </section>

      {/* ── Response Process ── */}
      <section className="mb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            كيف نتعامل مع رسائلك
          </h2>
        </motion.div>

        {/* Desktop */}
        <div className="hidden md:flex items-start justify-center gap-0 max-w-3xl mx-auto">
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
                <div className="flex flex-col items-center text-center w-44">
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
                    <ArrowRight className="w-4 h-4 text-primary-300 dark:text-primary-700 -ms-1 shrink-0" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Mobile */}
        <div className="md:hidden space-y-0 max-w-sm mx-auto">
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
                viewport={{ once: true, margin: '-10px' }}
                className="flex items-start gap-4"
              >
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 flex items-center justify-center shadow-md shadow-primary-600/20 shrink-0">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  {!isLast && (
                    <div className="w-0.5 h-8 bg-gradient-to-b from-primary-300 to-primary-200 dark:from-primary-700 dark:to-primary-800 my-1" />
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

      {/* ── Final Note ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-900/10 dark:via-dark-card dark:to-teal-900/10 border border-emerald-100 dark:border-emerald-800/30 p-8 md:p-12 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-5">
          <MessageCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
          شكراً لتواصلك
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto text-sm md:text-base leading-relaxed">
          نقدر ملاحظاتك وتساؤلاتك. كل رسالة تساعدنا على تحسين مورفن.
        </p>
      </motion.section>
    </div>
  );
}
