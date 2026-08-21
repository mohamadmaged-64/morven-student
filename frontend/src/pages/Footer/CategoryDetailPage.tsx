import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/UI';
import { ArrowRight, ArrowLeft, ArrowLeftRight, Clock, Sparkles, AlertCircle } from 'lucide-react';
import { categories, getToolsByCategory } from '@/data/tools';
import type { ToolCategory } from '@/types';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.06, ease: 'easeOut' },
  }),
};

const toolDetails: Record<string, string> = {
  // GENERAL
  'pomodoro-timer': 'حافظ على تركيزك مع تقنية بومودورو المثبتة. يساعدك هذا المؤقت على تقسيم جلسات الدراسة إلى فترات تركيز مدتها 25 دقيقة مع فترات راحة قصيرة بينها، مما يعزز حفظك ويمنعك من الإرهاق أثناء جلسات الدراسة الطويلة.',
  'task-manager': 'حافظ على تنظيم مهام دراستك وتتبع تقدمك بسهولة، أنشئ وأدر قائمة مهامك بواجهة نظيفة مصممة لمساعدتك على متابعة الواجبات المواعيد النهائية وأهداف الدراسة.',
  'exam-countdown': 'لا تفوّت مواعيد الامتحانات المهمة، حدد جدول امتحاناتك واحصل على عد تنازلي بصري واضح يظهر الأيام والساعات والدقائق المتبقية، مما يساعدك على التخطيط لجلسات الدراسة بفعالية.',

  // PDF
  'word-to-pdf': 'حوّل مستندات Word إلى صيغة PDF فوراً مع الحفاظ على جميع التنسيقات والخطوط والتخطيط. مثالي لمشاركة المستندات التي تبدو متسقة عبر جميع الأجهزة والمنصات.',
  'excel-to-pdf': 'حوّل جداول Excel إلى مستندات PDF احترافية. احتفظ بالجداول والرسوم البيانية والصيغ وتنسيق الخلايا لإنشاء تقارير ومستندات مالية قابلة للمشاركة.',
  'ppt-to-pdf': 'حوّل عروض PowerPoint إلى صيغة PDF مع الحفاظ على تخطيط الشرائح والعناصر التصميمية. مثالي لتوزيع محتوى العروض التقديمية دون الحاجة لبرنامج PowerPoint.',
  'merge-pdfs': 'ادمج ملفات PDF متعددة في مستند واحد منظم. اسحب وأفلت لإعادة ترتيب الصفحات قبل الدمج. مثالي لتجميع أوراق البحث أو الواجبات أو فصول التقارير.',
  'split-pdf': 'قسم ملف PDF كبير إلى ملفات أو نطاقات صفحات منفصلة. استخرج صفحات محددة أو قسم كل N صفحات أو فصل إلى ملفات صفحات فردية. مثالي لمشاركة الأقسام ذات الصلة فقط.',
  'delete-pages': 'أزل الصفحات غير المرغوب فيها من مستند PDF مع تحديد بصري للصفحات. تصفح الصور المصغرة، حدد الصفحات التي تريد إزالتها، وحمّل المستند المنظف فوراً.',
  'compress-pdf': 'قلّل حجم ملف PDF دون فقدان الجودة باستخدام خوارزميات ضغط ذكية.اجعل الملفات الكبيرة أسهل في المشاركة عبر البريد الإلكتروني أو تطبيقات المراسلة مع الحفاظ على قابلية القراءة.',
  'reorder-pages': 'أعد ترتيب الصفحات داخل مستند PDF باستخدام السحب والإفلات. مثالي لتنظيم المستندات متعددة الصفحات بالترتيب الصحيح قبل الطباعة أو المشاركة.',
  'rotate-pages': 'دوّر صفحات فردية أو جميع الصفحات في PDF بزاوية 90 أو 180 أو 270 درجة. صحّح المستندات الممسوحة ضوئياً التي تكون مائلة أو معكوسة بنقرة واحدة.',
  'password-protect': 'أضف حماية بكلمة مرور لملفات PDF للتحكم في من يمكنه عرض أو تحرير أو طباعة مستنداتك. ضروري للمحتوى الأكاديمي أو المهني الحساس.',
  'remove-password': 'أزل الحماية بكلمة المرور من ملفات PDF عندما لا تحتاج إلى طبقة الأمان بعد. يتطلب كلمة المرور الحالية للتفويض.',
  'add-watermark': 'أضف علامات مائية نصية أو صور إلى ملفات PDF لتحديد حالة المستند أو الملكية أو التصنيف. يدعم إعدادات التموضع والشفافية والتدوير المخصصة.',
  'add-signature': 'أضف توقيعات رقمية إلى مستندات PDF للمصادقة والتحقق. ارسم أو ارفع توقيعك وضعه في المكان المطلوب بالضبط في المستند.',
  'extract-images': 'استخرج جميع الصور المضمنة في ملف PDF واحفظها كملفات صور فردية. مفيد لاسترداد الرسومات أو الصور أو التوضيحات من المستندات.',
  'ocr': 'قم بالتعرف الضوئي على الأحرف في ملفات PDF الممسوحة ضوئياً لجعلها قابلة للبحث والتحديد. حوّل المستندات القائمة على الصور إلى PDFs قابلة للبحث بالنص.',
  'scan-to-text': 'حوّل المستندات والصور الممسوحة ضوئياً إلى نص قابل للتعديل باستخدام تكنولوجيا OCR المتقدمة. استخرج النص من صور المستندات أو السبّورات أو الملاحظات المكتوبة بخط اليد.',
  'compare-pdfs': 'قارن ملفي PDF جنباً إلى جنب وأبرز جميع الاختلافات بينهما. مثالي لمراجعة مراجعات المستندات أو تغييرات العقود أو تحديثات الإصدارات.',

  // POWERPOINT
  'generate-ppt-text': 'أنشئ عروض PowerPoint التقديمية الاحترافية من محتوى نصي عادي. ي هيكل الشرائح تلقائياً ويضيف النقاط الرئيسية ويصمم التخطيطات بالذكاء الاصطناعي.',
  'generate-ppt-pdf': 'حوّل مستندات PDF إلى عروض PowerPoint التقديمية. استخرج المحتوى، هيّكه إلى شرائح، وأنشئ عرضاً تقديمياً جذاباً بصرياً.',
  'generate-ppt-word': 'حوّل مستندات Word إلى عروض PowerPoint التقديمية المصقولة. استخرج العناوين والنقاط الرئيسية والمعلومات المهمة للشرائح تلقائياً.',
  'generate-ppt-research': 'أنشئ شرائح عرض تقديمي بحثية بهيكل أكاديمي صحيح. يتضمن أقسام المقدمة والمنهجية والنتائج والمناقشة والخاتمة.',
  'extract-ppt-text': 'استخرج جميع المحتوى النصي من ملفات PowerPoint للمراجعة أو التعديل أو إعادة الاستخدام. احصل على نص منظّف ومُنسّق من كل شريحة.',
  'convert-ppt-pdf': 'حوّل عروض PowerPoint التقديمية إلى صيغة PDF للمشاركة والطباعة والأرشفة بسهولة. يحافظ على جميع العناصر البصرية والتنسيق.',
  'improve-slides': 'تحسين شرائح PowerPoint التقديمية الحالية بالذكاء الاصطناعي. حسّن التصميم والتخطيط وتنظيم المحتوى والجاذبية البصرية بمقترحات ذكية.',
  'add-images-slides': 'أضف صوراً عالية الجودة ذات صلة تلقائياً إلى شرائح عرضك التقديمي. يختار الذكاء الاصطناعي صوراً تكمّل محتواك ورسالتك.',
  'generate-speaker-notes': 'أنشئ ملاحظات متحدث شاملة لشرائح عرضك التقديمي. تتضمن نقاط الحديث والتنقلات واقتراحات التوقيت لتقديم سلس.',

  // VIDEO
  'extract-audio-video': 'استخرج المسار الصوتي من أي ملف فيديو واحفظه كملف صوتي مستقل. مثالي لحفظ المحاضرات أو البودكاست أو الموسيقى من الفيديوهات.',
  'compress-video': 'قلّل أحجام ملفات الفيديو مع الحفاظ على الجودة. اضغط تسجيلات المحاضرات الكبيرة أو فيديوهات المشاريع للتخزين الأسهل والمشاركة الأسرع.',
  'convert-video': 'حوّل الفيديوهات بين صيغ مختلفة مثل MP4 وAVI وMKV والمزيد. تأكد من التوافق مع أي جهاز أو منصة.',
  'video-to-audio': 'استخرج الصوت من ملفات الفيديو واحفظه كـ MP3 أو WAV أو صيغ صوتية أخرى. رائع لإنشاء نسخ صوتية من محاضرات الفيديو.',

  // IMAGES
  'bg-remove': 'أزل الخلفيات من الصور تلقائياً باستخدام الذكاء الاصطناعي. أنشئ صوراً نظيفة واحترافية للمستندات أو العروض التقديمية أو الملفات الشخصية.',
  'rotate-image': 'دوّر الصور بأي زاوية بدقة. صحّح مشاكل التأطير من المستندات الممسوحة ضوئياً أو لقطات الكاميرا فوراً.',
  'blur-image': 'طبّع تأثيرات الضبابية على أجزاء أو الصورة كاملة. حمّ الخصوصية بتعتيم المعلومات الحساسة أو أنشئ تأثيرات خلفية فنية.',
  'images-to-pdf': 'حوّل صور متعددة إلى مستند PDF واحد. رتّب الصفحات، حدد الهوامش، وأنشئ ملفات PDF احترافية من صورك.',

  // AUDIO
  'speech-to-text': 'نسخ التسجيلات الصوتية إلى نص دقيق باستخدام التعرف على الكلام المتقدم. مثالي لتحويل المحاضرات أو المقابلات أو الاجتماعات إلى ملاحظات مكتوبة.',

  // QR CODE
  'qr-generator': 'أنشئ رموز QR من نص أو روابط أو معلومات اتصال أو أي بيانات. حمّل بأحجام مختلفة للطباعة على المستندات أو الملصقات أو بطاقات العمل.',
};

const VALID_CATEGORIES: ToolCategory[] = [
  'pdf', 'powerpoint', 'video', 'audio', 'images',
  'qrcode', 'general', 'medical', 'engineering',
];

export default function CategoryDetailPage() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();

  if (!category || !VALID_CATEGORIES.includes(category as ToolCategory)) {
    return (
      <div className="max-w-6xl mx-auto pb-16 text-center py-20">
        <AlertCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          فئة غير موجودة
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          الفئة التي تبحث عنها غير موجودة.
        </p>
        <Button
          onClick={() => navigate('/our-tools')}
          variant="primary"
          icon={<ArrowLeft className="w-4 h-4 rotate-180" />}
        >
          العودة لكل الأدوات
        </Button>
      </div>
    );
  }

  const cat = category as ToolCategory;
  const meta = categories[cat];
  const catTools = getToolsByCategory(cat);
  const Icon = meta.icon;

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* ── Back Link ── */}
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <button
          onClick={() => navigate('/our-tools')}
          className="inline-flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors font-medium"
        >
          <ArrowLeft className={`w-4 h-4 rotate-180`} />
          العودة لكل الأدوات
        </button>
      </motion.div>

      {/* ── Category Header ── */}
      <motion.section
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative rounded-3xl overflow-hidden mb-12 bg-gradient-to-br from-emerald-50 via-teal-50 to-white dark:from-emerald-900/20 dark:via-teal-900/10 dark:to-dark-bg border border-emerald-100 dark:border-emerald-800/30"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-200/40 dark:bg-emerald-700/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-200/40 dark:bg-teal-700/20 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 px-6 py-12 md:py-16 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-6"
          >
            <Icon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight"
          >
            {meta.name}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-base md:text-lg leading-relaxed"
          >
            {`${catTools.length} أداة متاحة`}
          </motion.p>
        </div>
      </motion.section>

      {/* ── Tools Grid ── */}
      <section className="mb-16">
        {catTools.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              لا توجد أدوات متاحة في هذا القسم بعد.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {catTools.map((tool, i) => {
              const ToolIcon = tool.icon;
              const detail = toolDetails[tool.id];
              return (
                <motion.div
                  key={tool.id}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-20px' }}
                  className="group rounded-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border p-6 transition-all duration-300 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-800/40"
                >
                  <div className="flex items-start gap-4 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                      <ToolIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                          {tool.name}
                        </h3>
                        {tool.comingSoon && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-semibold uppercase tracking-wide">
                            <Sparkles className="w-2.5 h-2.5" />
                            قريبًا
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {detail ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed pl-14">
                      {detail}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed pl-14">
                      {tool.description}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Final CTA ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-800 p-8 md:p-12 text-center"
      >
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
          استكشف فئات أخرى
        </h2>
        <p className="text-primary-100 max-w-md mx-auto mb-8 text-sm md:text-base">
          مورفن للطلاب يقدم مجموعة أدوات شاملة.
        </p>
        <Button
          onClick={() => navigate('/our-tools')}
          variant="secondary"
          size="lg"
          icon={<ArrowLeft className="w-5 h-5 rotate-180" />}
          iconRight={undefined}
          className="bg-white text-primary-700 hover:bg-gray-100 dark:bg-gray-900 dark:text-primary-300 dark:hover:bg-gray-800"
        >
          العودة لكل الأدوات
        </Button>
      </motion.section>
    </div>
  );
}
