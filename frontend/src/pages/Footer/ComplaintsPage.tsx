import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bug,
  Lightbulb,
  AlertOctagon,
  MessageSquare,
  Send,
  CheckCircle2,
  Search,
  Rocket,
  Shield,
  Eye,
  RefreshCw,
  Upload,
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

const feedbackCategories = [
  {
    icon: Bug,
    titleEn: 'Report a Bug',
    titleAr: 'الإبلاغ عن خطأ',
    descEn: 'Found something broken or not working as expected? Report it so we can fix it.',
    descAr: 'وجدت شيئاً معطلاً أو لا يعمل كما هو متوقع؟ أبلغنا لنصلحه.',
  },
  {
    icon: Lightbulb,
    titleEn: 'Suggest a Feature',
    titleAr: 'اقتراح ميزة',
    descEn: 'Have an idea that could make Morven better? We are always listening.',
    descAr: 'لديك فكرة قد تجعل مورfen أفضل؟ نحن دائماً نستمع.',
  },
  {
    icon: AlertOctagon,
    titleEn: 'Submit a Complaint',
    titleAr: 'تقديم شكوى',
    descEn: 'Something not meeting your expectations? Let us know so we can address it.',
    descAr: 'شيء لا يلبي توقعاتك؟ أخبرنا لنعالجه.',
  },
  {
    icon: MessageSquare,
    titleEn: 'General Feedback',
    titleAr: 'ملاحظات عامة',
    descEn: 'Any thoughts, ideas, or comments about Morven are welcome.',
    descAr: 'كل الأفكار أو التعليقات حول مورfen مرحب بها.',
  },
];

const processSteps = [
  { icon: Send, titleEn: 'Submit Feedback', titleAr: 'إرسال الملاحظات', descEn: 'Fill and submit the form.', descAr: 'املأ النموذج وأرسله.' },
  { icon: Search, titleEn: 'Review', titleAr: 'المراجعة', descEn: 'Our team reviews your input.', descAr: 'فريقنا يراجع مدخلاتك.' },
  { icon: Rocket, titleEn: 'Improvement', titleAr: 'التحسين', descEn: 'Your feedback drives real changes.', descAr: 'ملاحظاتك تدفع تغييرات حقيقية.' },
];

const feedbackTypes = [
  { value: 'bug', labelEn: 'Bug Report', labelAr: 'تقرير خطأ' },
  { value: 'feature', labelEn: 'Feature Suggestion', labelAr: 'اقتراح ميزة' },
  { value: 'complaint', labelEn: 'Complaint', labelAr: 'شكوى' },
  { value: 'feedback', labelEn: 'General Feedback', labelAr: 'ملاحظات عامة' },
  { value: 'other', labelEn: 'Other', labelAr: 'أخرى' },
];

const priorities = [
  { value: 'low', labelEn: 'Low', labelAr: 'منخفضة', color: 'text-gray-500 dark:text-gray-400' },
  { value: 'medium', labelEn: 'Medium', labelAr: 'متوسطة', color: 'text-amber-500' },
  { value: 'high', labelEn: 'High', labelAr: 'عالية', color: 'text-red-500' },
];

const commitments = [
  { en: 'Every piece of feedback is reviewed by our team', ar: 'تمت مراجعة كل ملاحظة من قبل فريقنا' },
  { en: 'Your input directly influences which features we build next', ar: 'مدخلاتك تؤثر مباشرة على الميزات التي نبنيها التالي' },
  { en: 'Bug reports are addressed as quickly as possible', ar: 'تتم معالجة تقارير الأخطاء بأسرع وقت ممكن' },
 
];

export default function ComplaintsPage() {
  const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
  const isAr = lang === 'ar';

  const [form, setForm] = useState({
    name: '', email: '', type: 'bug', subject: '', description: '', priority: 'medium',
  });
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
            <MessageSquare className="w-3.5 h-3.5" />
            {isAr ? 'شكاوى واقتراحات' : 'Complaints & Suggestions'}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight leading-tight"
          >
            {isAr ? 'رأيك' : 'Your Voice'}
            <br />
            <span className="text-primary-600 dark:text-primary-400">
              {isAr ? 'يهمنا' : 'Matters'}
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-base md:text-lg leading-relaxed"
          >
            {isAr
              ? 'نقدر ملاحظاتك وشكاويك واقتراحاتك.'
              : 'We value your complaints, suggestions, bug reports, and general feedback. Share your ideas and contributions to make Morven better.'}
          </motion.p>
        </div>
      </motion.section>

 

      {/* ── Feedback Form ── */}
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
                  {isAr ? 'تم إرسال ملاحظاتك!' : 'Feedback Submitted!'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                  {isAr
                    ? 'شكراً لمساهمتك. ملاحظاتك تساعدنا على تحسين مورفن.'
                    : 'Thank you for your contribution. Your feedback helps us improve Morven.'}
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: '', email: '', type: 'bug', subject: '', description: '', priority: 'medium' }); }}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
                >
                  {isAr ? 'إرسال ملاحظات أخرى' : 'Submit Another Feedback'}
                </button>
              </motion.div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                    <Send className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {isAr ? 'أرسل ملاحظاتك' : 'Submit Your Feedback'}
                  </h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {isAr ? 'الاسم الكامل' : 'Full Name'}
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        placeholder={isAr ? 'أدخل اسمك' : 'Enter your name'}
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        placeholder={isAr ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {isAr ? 'نوع الملاحظات' : 'Feedback Type'}
                      </label>
                      <select
                        name="type"
                        value={form.type}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 appearance-none"
                      >
                        {feedbackTypes.map((t) => (
                          <option key={t.value} value={t.value}>
                            {isAr ? t.labelAr : t.labelEn}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {isAr ? 'الأولوية' : 'Priority'}
                      </label>
                      <select
                        name="priority"
                        value={form.priority}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 appearance-none"
                      >
                        {priorities.map((p) => (
                          <option key={p.value} value={p.value}>
                            {isAr ? p.labelAr : p.labelEn}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {isAr ? 'الموضوع' : 'Subject'}
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      required
                      placeholder={isAr ? 'موضوع الملاحظات' : 'Feedback subject'}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {isAr ? 'الوصف' : 'Description'}
                    </label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      required
                      rows={5}
                      placeholder={isAr ? 'اكتب وصفاً تفصيلياً...' : 'Write a detailed description...'}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-dark-surface border border-light-border dark:border-dark-border text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 resize-none"
                    />
                  </div>

                  {/* Screenshot Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {isAr ? 'لقطة شاشة (اختياري)' : 'Screenshot (Optional)'}
                    </label>
                    <div className="flex items-center justify-center w-full px-4 py-6 rounded-xl border-2 border-dashed border-light-border dark:border-dark-border bg-gray-50 dark:bg-dark-surface hover:border-primary-300 dark:hover:border-primary-700 transition-colors duration-200 cursor-pointer">
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {isAr ? 'اسحب وأفلت صورة هنا أو انقر للاختيار' : 'Drag and drop an image here or click to select'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-700 text-white text-sm font-medium transition-colors duration-200 shadow-md shadow-primary-600/20"
                  >
                    <Send className="w-4 h-4" />
                    {isAr ? 'إرسال الملاحظات' : 'Submit Feedback'}
                  </button>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </section>

      {/* ── What Happens Next ── */}
      <section className="mb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            {isAr ? 'ماذا يحدث بعد الإرسال؟' : 'What Happens Next?'}
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
                    {isAr ? step.titleAr : step.titleEn}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {isAr ? step.descAr : step.descEn}
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
                    {isAr ? step.titleAr : step.titleEn}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {isAr ? step.descAr : step.descEn}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Our Commitment ── */}
      <section className="mb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            {isAr ? 'التزامنا بملاحظاتك' : 'Our Commitment to Your Feedback'}
          </h2>
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
                  {isAr ? item.ar : item.en}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Final Thank You ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-800 p-8 md:p-12 text-center"
      >
        <MessageSquare className="w-8 h-8 text-primary-200 mx-auto mb-4" />
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
          {isAr ? 'شكراً لمساهمتك' : 'Thank You for Your Feedback'}
        </h2>
        <p className="text-primary-100 max-w-md mx-auto mb-8 text-sm md:text-base">
          {isAr
            ? 'كل ملاحظة تساعدنا على بناء منصة أفضل. لا تتردد في المشاركة في أي وقت.'
            : 'Every piece of feedback helps us build a better platform. Feel free to share anytime.'}
        </p>
      </motion.section>
    </div>
  );
}
