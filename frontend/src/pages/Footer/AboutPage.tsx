import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/UI';
import {
  GraduationCap,
  Rocket,
  Target,
  Eye,
  Zap,
  Lock,
  Palette,
  Layers,
  Monitor,
  Globe,
  Heart,
  RefreshCw,
  Lightbulb,
  Accessibility,
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

const missionVision = [
  {
    icon: Target,
    titleEn: 'Our Mission',
    titleAr: 'مهمتنا',
    descEn: 'Our mission is to harness technology in the service of people by developing reliable, fast, and intuitive digital tools that simplify everyday tasks and enhance productivity without unnecessary complexity. We strive to build a comprehensive platform that delivers practical solutions for individuals across a wide range of fields, while remaining committed to quality, innovation, and continuous improvement. We believe that the best technology is the kind that creates meaningful value and makes life easier for its users.',
    descAr: 'تتمثل مهمتنا في تسخير التقنية لخدمة الناس، من خلال تطوير أدوات رقمية موثوقة، سريعة، وسهلة الاستخدام، تُسهم في تبسيط المهام اليومية ورفع الإنتاجية دون تعقيد. ونسعى إلى بناء منصة متكاملة تُقدّم حلولًا عملية تلبي احتياجات الأفراد في مختلف المجالات، مع الالتزام بالجودة، والابتكار، والتحسين المستمر، إيمانًا بأن أفضل التقنيات هي تلك التي تُحدث أثرًا نافعًا وتُيسّر حياة مستخدميها',
  },
  {
    icon: Eye,
    titleEn: 'Our Vision',
    titleAr: 'رؤيتنا',
    descEn: 'Our vision is for Morven to become a leading digital platform that harnesses technology for the benefit of people by delivering meaningful, reliable, and user-friendly solutions. We aspire to build a comprehensive ecosystem of tools and services that elevates the user experience, promotes a culture of quality and excellence, and leaves a lasting positive impact through technology that truly serves and empowers everyone.',
    descAr: 'رؤيتنا أن تصبح مورفن منصةً رقمية رائدة تُسخّر التقنية فيما ينفع الناس، وتُقدّم حلولًا موثوقة تُسهّل حياتهم وتُعينهم على الإنجاز والإبداع. ونطمح إلى بناء منظومة متكاملة من الأدوات والخدمات ترتقي بتجربة المستخدم، وتُسهم في نشر ثقافة الجودة والإتقان، ليبقى أثر مورفن ممتدًا في كل عملٍ نافع وكل إنجازٍ يُحقق الخير للناس.',
  },
];

const values = [
  {
    icon: Heart,
    titleEn: 'Simplicity',
    titleAr: 'البساطة',
    descEn: 'Keep things simple. No clutter, no complexity — just tools that work.',
    descAr: 'اجعل الأمور بسيطة. لا فوضى، لا تعقيد — فقط أدوات تعمل.',
  },
  {
    icon: RefreshCw,
    titleEn: 'Reliability',
    titleAr: 'الموثوقية',
    descEn: 'Deliver consistent, dependable results every time you use a tool.',
    descAr: 'تقديم نتائج متسقة وموثوقة في كل مرة تستخدم فيها أداة.',
  },
  {
    icon: Accessibility,
    titleEn: 'Accessibility',
    titleAr: 'سهولة الوصول',
    descEn: 'Free and available to every student, on any device, in multiple languages.',
    descAr: 'مجاني ومتاح لكل طالب، على أي جهاز، بلغات متعددة.',
  },
  {
    icon: Lightbulb,
    titleEn: 'Innovation',
    titleAr: 'الابتكار',
    descEn: 'Continuously adopt new technologies to build better, smarter tools.',
    descAr: 'تبني تقنيات جديدة باستمرار لبناء أدوات أفضل وأذكى.',
  },
  {
    icon: Rocket,
    titleEn: 'Continuous Improvement',
    titleAr: 'التحسين المستمر',
    descEn: 'Listen to student feedback and evolve the platform based on real needs.',
    descAr: 'الاستماع لملاحظات الطلاب وتطوير المنصة بناءً على الاحتياجات الفعلية.',
  },
];

export default function AboutPage() {
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
            <GraduationCap className="w-3.5 h-3.5" />
            {isAr ? 'من نحن' : 'About Us'}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight leading-tight"
          >
            {isAr ? 'نبني' : 'Building'}
            <br />
            <span className="text-primary-600 dark:text-primary-400">
              {isAr ? 'مستقبل الدراسة' : 'The Future of Study'}
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-base md:text-lg leading-relaxed"
          >
            {isAr
              ? 'مورفن للطلاب هو منصة إنتاجية شاملة مصممة لمساعدة الطلاب على الدراسة بذكاء وبكفاءة.'
              : 'Morven for Students is an all-in-one productivity platform designed to help students study smarter and more efficiently.'}
          </motion.p>
        </div>
      </motion.section>

      {/* ── Our Story ── */}
      <section className="mb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border p-8 md:p-10"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {isAr ? 'قصتنا' : 'Our Story'}
            </h2>
          </div>
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400 ">
            <p>
              {isAr
                ? 'امتثالًا لقوله تعالى: ﴿وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَى﴾، كانت مورفن ثمرةَ رؤيةٍ اجتمع عليها طلابٌ آمنوا بأن العلم والمعرفة ينبغي أن يكونا في متناول الجميع، فسخّروا وقتهم وجهدهم لبناء منصةٍ متكاملة تُيسّر الأعمال، وتُعين على الإنجاز، وتُقدّم أدواتٍ رقمية موثوقة تخدم الأفراد بمختلف مجالاتهم واحتياجاتهم. وانطلاقًا من هذا المبدأ، نواصل تطوير مورفن بعنايةٍ واحترافية، لنقدّم تجربةً تجمع بين الجودة، والبساطة، والابتكار، إيمانًا منّا بأن خير الأعمال ما كان أنفع للناس وأبقى أثرًا.' 
                : 'In accordance with the words of Allah Almighty, ﴿وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَى﴾, Morven was born from a shared vision of students who believed that knowledge and practical resources should be accessible to everyone. They dedicated their time and effort to building a comprehensive platform that simplifies everyday tasks and provides reliable digital tools for individuals across diverse fields and professions. Guided by this principle, we continue to develop Morven with care and professionalism, delivering an experience that combines quality, simplicity, and innovation, driven by our belief that the best work is that which brings lasting benefit to people.'
                }
            </p>
      
          </div>
        </motion.div>
      </section>

      {/* ── Mission & Vision ── */}
      <section className="mb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            {isAr ? 'مهمتنا ورؤيتنا' : 'Mission & Vision'}
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {missionVision.map((item, i) => {
            const Icon = item.icon;
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
                <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-3">
                  {isAr ? item.titleAr : item.titleEn}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {isAr ? item.descAr : item.descEn}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Our Values ── */}
      <section className="mb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            {isAr ? 'قيمنا' : 'Our Values'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
            {isAr
              ? 'المبادئ التي نعمل بها كل يوم.'
              : 'The principles we live by every day.'}
          </p>
        </motion.div>
        <div className="max-w-2xl mx-auto space-y-0">
          {values.map((item, i) => {
            const Icon = item.icon;
            const isLast = i === values.length - 1;
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
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 flex items-center justify-center shadow-md shadow-primary-600/20 shrink-0">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  {!isLast && (
                    <div className="w-0.5 h-8 bg-gradient-to-b from-primary-300 to-primary-200 dark:from-primary-700 dark:to-primary-800 my-1" />
                  )}
                </div>
                <div className="pt-2 pb-6">
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

      {/* ── Final CTA ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-800 p-8 md:p-12 text-center"
      >
        <GraduationCap className="w-8 h-8 text-primary-200 mx-auto mb-4" />
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
          {isAr ? 'استكشف أدواتنا' : 'Explore Our Tools'}
        </h2>
        <p className="text-primary-100 max-w-md mx-auto mb-8 text-sm md:text-base">
          {isAr
            ? 'ابدأ استخدام أدواتنا المجانية الآن واكتشف كيف يمكنها مساعدتك.'
            : 'Start using our free tools now and discover how they can help you.'}
        </p>
        <Button
          onClick={() => navigate('/our-tools')}
          variant="secondary"
          size="lg"
          icon={<ArrowRight className={`w-5 h-5 ${isAr ? 'rotate-180' : ''}`} />}
          className="bg-white text-primary-700 hover:bg-gray-100 dark:bg-gray-900 dark:text-primary-300 dark:hover:bg-gray-800"
        >
          {isAr ? 'استكشف الأدوات' : 'Explore Tools'}
        </Button>
      </motion.section>
    </div>
  );
}
