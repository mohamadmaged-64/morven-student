import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/UI';
import {
  Shield,
  Eye,
  Database,
  Lock,
  Clock,
  FileText,
  Cookie,
  Globe,
  UserCheck,
  MessageCircle,
  Mail,
  Calendar,
  FolderOpen,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: 'easeOut' },
  }),
};



const policySections = [
  {
    icon: FolderOpen,
    titleEn: 'Information We Collect',
    titleAr: 'المعلومات التي نجمعها',
    contentEn: 'Morven is designed to minimize data collection. When you visit our website, we may automatically collect basic technical information such as your browser type, operating system, and pages visited, solely for the purpose of maintaining and improving the service. We do not collect personal identification information unless you voluntarily provide it — for example, by sending us a message through the contact page. When you use our file processing tools, the files you upload are handled as described in the File Processing section below.',
    contentAr: 'مورفن مصمم لتقليل جمع البيانات. عند زيارتك لموقعنا، قد نجمع تلقائياً معلومات تقنية أساسية مثل نوع المتصفح والنظام التشغيلي والصفحات التي تمت زيارتها، فقط لأغراض صيانة وتحسين الخدمة. لا نجمع معلومات تعريف شخصية إلا إذا قدمتها طوعياً — على سبيل المثال، بإرسال لنا رسالة عبر صفحة الاتصال. عند استخدام أدوات معالجة الملفات، تُعالج الملفات التي ترفعها كما هو موضح في قسم معالجة الملفات أدناه.',
  },
  {
    icon: FileText,
    titleEn: 'File Processing',
    titleAr: 'معالجة الملفات',
    contentEn: 'Most Morven tools process your files entirely within your browser using client-side JavaScript. This means your files never leave your device and are not transmitted to any server. For certain tools that require server-side processing (such as converting Office documents to PDF), files are sent to our backend servers over an encrypted connection. These files are processed immediately and permanently deleted within seconds of completing the operation. We do not read, analyze, or retain any content from your files.',
    contentAr: 'تتم معالجة ملفاتك في معظم أدوات مورفن بالكامل في متصفحك باستخدام JavaScript جانب العميل. هذا يعني أن ملفاتك لا تغادر جهازك ولا تُرسل إلى أي خادم. لأدوات معينة تتطلب معالجة جانب الخادم (مثل تحويل مستندات Office إلى PDF)، تُرسل الملفات إلى خوادمنا عبر اتصال مشفّر. تُعالج هذه الملفات فوراً وتُحذف بشكل دائم خلال ثوانٍ من اكتمال العملية. لا نقرأ أو نحلل أو نحتفظ بأي محتوى من ملفاتك.',
  },
  {
    icon: Globe,
    titleEn: 'Third-Party Services',
    titleAr: 'الخدمات الخارجية',
    contentEn: 'Morven does not integrate with any third-party analytics, advertising, or tracking services. We do not use Google Analytics, Facebook Pixel, or similar tools. Our website is self-contained and does not load external scripts for tracking or advertising purposes. If this changes in the future, this policy will be updated accordingly.',
    contentAr: 'لا يتكامل مورفن مع أي خدمات تحليلات أو إعلانات أو تتبع تابعة لجهات خارجية. لا نستخدم Google Analytics أو Facebook Pixel أو أدوات مماثلة. موقعنا يعمل بشكل مستقل ولا يحمّل نصوصاً خارجية لأغراض التتبع أو الإعلانات. إذا تغير هذا في المستقبل، سيتم تحديث هذه السياسة وفقاً لذلك.',
  },
  {
    icon: UserCheck,
    titleEn: 'Your Rights',
    titleAr: 'حقوقك',
    contentEn: 'You have the right to know what data we collect and how it is used. Since we collect minimal data and do not retain file contents, there is very little personal data to request. If you have contacted us through the contact page, you may request deletion of that correspondence at any time. You can change your language and theme preferences at any time through the website interface.',
    contentAr: 'لديك الحق في معرفة البيانات التي نجمعها وكيف تُستخدم. نظراً لأننا نجمع بيانات محدودة ولا نحتفظ بمحتوى الملفات، هناك القليل من البيانات الشخصية التي يمكن طلبها. إذا تواصلت معنا عبر صفحة الاتصال، يمكنك طلب حذف تلك المراسلة في أي وقت. يمكنك تغيير تفضيلات اللغة والمظهر في أي وقت من خلال واجهة الموقع.',
  },
  {
    icon: Mail,
    titleEn: 'Contact Information',
    titleAr: 'معلومات الاتصال',
    contentEn: 'If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please reach out to us through our Contact page. We will respond to your inquiry as promptly as possible.',
    contentAr: 'إذا كان لديك أي أسئلة أو مخاوف أو طلبات تتعلق بسياسة الخصوصية هذه أو ممارسات البيانات لدينا، يرجى التواصل معنا عبر صفحة الاتصال. سنرد على استفسارك في أسرع وقت ممكن.',
  },
];

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
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
            <Shield className="w-3.5 h-3.5" />
            {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight leading-tight"
          >
            {isAr ? 'سياسة' : 'Privacy'}
            <br />
            <span className="text-primary-600 dark:text-primary-400">
              {isAr ? 'الخصوصية' : 'Policy'}
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-base md:text-lg leading-relaxed"
          >
            {isAr
              ? 'نعمل بشفافية ونحترم خصوصيتك.'
              : 'We operate with transparency and respect your privacy.'}
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mt-6 inline-flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500"
          >
            <Calendar className="w-3.5 h-3.5" />
            {isAr ? 'آخر تحديث: يوليو 2026' : 'Last updated: July 2026'}
          </motion.div>
        </div>
      </motion.section>

      
      {/* ── Policy Sections ── */}
      <section className="mb-20 space-y-4">
        {policySections.map((section, i) => {
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
                  {isAr ? section.titleAr : section.titleEn}
                </h2>
              </div>
              <div className="pl-0 md:pl-14">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                  {isAr ? section.contentAr : section.contentEn}
                </p>
              </div>
            </motion.div>
          );
        })}
      </section>
    </div>
  );
}
