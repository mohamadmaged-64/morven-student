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

const toolDetails: Record<string, { en: string; ar: string }> = {
  // GENERAL
  'pomodoro-timer': { en: 'Stay focused with the proven Pomodoro Technique. This timer helps you break study sessions into 25-minute focused intervals with short breaks between them, boosting your concentration and preventing burnout during long study marathons.', ar: 'حافظ على تركيزك مع تقنية بومودورو المثبتة. يساعدك هذا المؤقت على تقسيم جلسات الدراسة إلى فترات تركيز مدتها 25 دقيقة مع فترات راحة قصيرة بينها، مما يعزز حفظك ويمنعك من الإرهاق أثناء جلسات الدراسة الطويلة.' },
  'task-manager': { en: 'Keep your study tasks organized and track your progress effortlessly. Create, prioritize, and manage your to-do list with a clean interface designed to help you stay on top of assignments, deadlines, and study goals.', ar: 'حافظ على تنظيم مهام دراستك وتتبع تقدمك بسهولة، أنشئ وأدر قائمة مهامك بواجهة نظيفة مصممة لمساعدتك على متابعة الواجبات المواعيد النهائية وأهداف الدراسة.' },
  'exam-countdown': { en: 'Never lose track of important exam dates. Set your exam schedule and get a clear visual countdown showing days, hours, and minutes remaining, helping you plan your study sessions effectively.', ar: 'لا تفوّت مواعيد الامتحانات المهمة، حدد جدول امتحاناتك واحصل على عد تنازلي بصري واضح يظهر الأيام والساعات والدقائق المتبقية، مما يساعدك على التخطيط لجلسات الدراسة بفعالية.' },

  // PDF
  'word-to-pdf': { en: 'Convert your Word documents to PDF format instantly while preserving all formatting, fonts, and layout. Perfect for sharing documents that look consistent across all devices and platforms.', ar: 'حوّل مستندات Word إلى صيغة PDF فوراً مع الحفاظ على جميع التنسيقات والخطوط والتخطيط. مثالي لمشاركة المستندات التي تبدو متسقة عبر جميع الأجهزة والمنصات.' },
  'excel-to-pdf': { en: 'Transform Excel spreadsheets into professional PDF documents. Preserve tables, charts, formulas, and cell formatting to create shareable reports and financial documents.', ar: 'حوّل جداول Excel إلى مستندات PDF احترافية. احتفظ بالجداول والرسوم البيانية والصيغ وتنسيق الخلايا لإنشاء تقارير ومستندات مالية قابلة للمشاركة.' },
  'ppt-to-pdf': { en: 'Convert PowerPoint presentations to PDF format, preserving slide layouts, animations, and design elements. Ideal for distributing presentation content without requiring PowerPoint software.', ar: 'حوّل عروض PowerPoint إلى صيغة PDF مع الحفاظ على تخطيط الشرائح والعناصر التصميمية. مثالي لتوزيع محتوى العروض التقديمية دون الحاجة لبرنامج PowerPoint.' },
  'merge-pdfs': { en: 'Combine multiple PDF files into a single, organized document. Drag and drop to reorder pages before merging. Perfect for consolidating research papers, assignments, or report chapters.', ar: 'ادمج ملفات PDF متعددة في مستند واحد منظم. اسحب وأفلت لإعادة ترتيب الصفحات قبل الدمج. مثالي لتجميع أوراق البحث أو الواجبات أو فصول التقارير.' },
  'split-pdf': { en: 'Split a large PDF into separate files or page ranges. Extract specific pages, divide by every N pages, or separate into individual page files. Ideal for sharing only the relevant sections you need.', ar: 'قسم ملف PDF كبير إلى ملفات أو نطاقات صفحات منفصلة. استخرج صفحات محددة أو قسم كل N صفحات أو فصل إلى ملفات صفحات فردية. مثالي لمشاركة الأقسام ذات الصلة فقط.' },
  'delete-pages': { en: 'Remove unwanted pages from a PDF document with visual page selection. Browse thumbnails, select the pages you want to remove, and download the cleaned document instantly.', ar: 'أزل الصفحات غير المرغوب فيها من مستند PDF مع تحديد بصري للصفحات. تصفح الصور المصغرة، حدد الصفحات التي تريد إزالتها، وحمّل المستند المنظف فوراً.' },
  'compress-pdf': { en: 'Reduce PDF file size without losing quality using smart compression algorithms. Make large files easier to share via email or messaging apps while maintaining readability.', ar: 'قلّل حجم ملف PDF دون فقدان الجودة باستخدام خوارزميات ضغط ذكية.اجعل الملفات الكبيرة أسهل في المشاركة عبر البريد الإلكتروني أو تطبيقات المراسلة مع الحفاظ على قابلية القراءة.' },
  'reorder-pages': { en: 'Rearrange pages within a PDF document using drag and drop. Perfect for organizing multi-page documents into the correct order before printing or sharing.', ar: 'أعد ترتيب الصفحات داخل مستند PDF باستخدام السحب والإفلات. مثالي لتنظيم المستندات متعددة الصفحات بالترتيب الصحيح قبل الطباعة أو المشاركة.' },
  'rotate-pages': { en: 'Rotate individual pages or all pages in a PDF by 90, 180, or 270 degrees. Fix scanned documents that are sideways or upside down with a single click.', ar: 'دوّر صفحات فردية أو جميع الصفحات في PDF بزاوية 90 أو 180 أو 270 درجة. صحّح المستندات الممسوحة ضوئياً التي تكون مائلة أو معكوسة بنقرة واحدة.' },
  'password-protect': { en: 'Add password protection to your PDF files to control who can view, edit, or print your documents. Essential for sensitive academic or professional content.', ar: 'أضف حماية بكلمة مرور لملفات PDF للتحكم في من يمكنه عرض أو تحرير أو طباعة مستنداتك. ضروري للمحتوى الأكاديمي أو المهني الحساس.' },
  'remove-password': { en: 'Remove password protection from PDF files when you no longer need the security layer. Requires the current password for authorization.', ar: 'أزل الحماية بكلمة المرور من ملفات PDF عندما لا تحتاج إلى طبقة الأمان بعد. يتطلب كلمة المرور الحالية للتفويض.' },
  'add-watermark': { en: 'Add text or image watermarks to PDF files to mark document status, ownership, or classification. Supports custom positioning, opacity, and rotation settings.', ar: 'أضف علامات مائية نصية أو صور إلى ملفات PDF لتحديد حالة المستند أو الملكية أو التصنيف. يدعم إعدادات التموضع والشفافية والتدوير المخصصة.' },
  'add-signature': { en: 'Add digital signatures to PDF documents for authentication and verification. Draw or upload your signature and place it exactly where needed on the document.', ar: 'أضف توقيعات رقمية إلى مستندات PDF للمصادقة والتحقق. ارسم أو ارفع توقيعك وضعه في المكان المطلوب بالضبط في المستند.' },
  'extract-images': { en: 'Extract all images embedded in a PDF file and save them as individual image files. Useful for recovering graphics, photos, or illustrations from documents.', ar: 'استخرج جميع الصور المضمنة في ملف PDF واحفظها كملفات صور فردية. مفيد لاسترداد الرسومات أو الصور أو التوضيحات من المستندات.' },
  'ocr': { en: 'Perform optical character recognition on scanned PDF files to make them searchable and selectable. Convert image-based documents into text-searchable PDFs.', ar: 'قم بالتعرف الضوئي على الأحرف في ملفات PDF الممسوحة ضوئياً لجعلها قابلة للبحث والتحديد. حوّل المستندات القائمة على الصور إلى PDFs قابلة للبحث بالنص.' },
  'scan-to-text': { en: 'Convert scanned documents and images into editable text using advanced OCR technology. Extract text from photos of documents, whiteboards, or handwritten notes.', ar: 'حوّل المستندات والصور الممسوحة ضوئياً إلى نص قابل للتعديل باستخدام تكنولوجيا OCR المتقدمة. استخرج النص من صور المستندات أو السبّورات أو الملاحظات المكتوبة بخط اليد.' },
  'compare-pdfs': { en: 'Compare two PDF files side by side and highlight all differences between them. Ideal for reviewing document revisions, contract changes, or version updates.', ar: 'قارن ملفي PDF جنباً إلى جنب وأبرز جميع الاختلافات بينهما. مثالي لمراجعة مراجعات المستندات أو تغييرات العقود أو تحديثات الإصدارات.' },

  // AI
  'summarize-text': { en: 'Automatically generate concise summaries of any text content using advanced AI. Extract key points, main arguments, and essential information in seconds.', ar: 'أنشئ ملخصات موجزة تلقائياً لأي محتوى نصي باستخدام الذكاء الاصطناعي المتقدم. استخرج النقاط الرئيسية والحجج الأساسية والمعلومات الجوهرية في ثوانٍ.' },
  'summarize-pdf': { en: 'Upload any PDF document and receive an instant AI-powered summary. Perfect for quickly reviewing research papers, textbooks, or lengthy reports without reading everything.', ar: 'ارفع أي مستند PDF واحصل على ملخص فوري مدعوم بالذكاء الاصطناعي. مثالي لمراجعة أوراق البحث أو الكتب المدرسية أو التقارير الطويلة بسرعة.' },
   'summarize-images': { en: 'Extract text from images using OCR and generate a concise summary of the content. Ideal for summarizing handwritten notes, whiteboard photos, or document scans.', ar: 'استخرج النص من الصور باستخدام OCR وأنشئ ملخصاً موجزاً للمحتوى. مثالي لتلخيص الملاحظات المكتوبة بخط اليد أو صور السبّورات أو مستندات الماسح الضوئي.' },
  'summarize-youtube': { en: 'Paste a YouTube URL and get a comprehensive summary of the video content. Save hours of watching by extracting key information from educational videos instantly.', ar: 'الصق رابط YouTube واحصل على ملخص شامل لمحتوى الفيديو. وفّر ساعات المشاهدة باستخراج المعلومات الرئيسية من فيديوهات التعليم فوراً.' },
  'summarize-audio': { en: 'Upload audio recordings and receive a transcript plus a concise summary. Perfect for summarizing lectures, podcasts, or interview recordings.', ar: 'ارفع التسجيلات الصوتية واحصل على نص مكتوب مع ملخص موجز. مثالي لتلخيص المحاضرات أو البودكاست أو تسجيلات المقابلات.' },
  'explain-simply': { en: 'Paste any complex text or concept and receive a clear, simple explanation using AI. Break down difficult topics into easy-to-understand language.', ar: 'الصق أي نص أو مفهوم معقد واحصل على شرح واضح وبسيط باستخدام الذكاء الاصطناعي. فكك المواضيع الصعبة إلى لغة سهلة الفهم.' },
  'rewrite-text': { en: 'Rewrite text in different styles, tones, or levels of formality. Improve clarity, adjust for academic writing, or make content more engaging.', ar: 'أعد كتابة النص بأساليب أو نغمات أو مستويات رسمية مختلفة. حسّن الوضوح أو عدّل للكتابة الأكاديمية أو اجعل المحتوى أكثر جاذبية.' },
  'grammar-check': { en: 'Analyze text for grammar, spelling, and punctuation errors. Receive detailed corrections and suggestions to improve your writing quality.', ar: 'حلّل النص لاكتشاف أخطاء القواعد والإملاء والترقيم. احصل على تصحيحات وإقتراحات مفصلة لتحسين جودة كتابتك.' },
  'translate': { en: 'Translate text between multiple languages with natural, accurate results. Supports academic and professional terminology for reliable translations.', ar: 'ترجم النصوص بين لغات متعددة بنتائج طبيعية ودقيقة. يدعم المصطلحات الأكاديمية والمهنية لترجمات موثوقة.' },
  'paragraph-to-bullets': { en: 'Convert long paragraphs into organized bullet point summaries. Perfect for creating study notes, presentation outlines, or quick reference guides.', ar: 'حوّل الفقرات الطويلة إلى ملخصات نقاط منظمة. مثالي لإنشاء ملاحظات دراسية أو مخططات عروض تقديمية أو أدوات مرجعية سريعة.' },
  'bullets-to-article': { en: 'Expand bullet points into a complete, well-structured article or paragraph. Great for turning study notes into full written assignments.', ar: 'وسّع النقاط إلى مقال أو فقرة كاملة ومنظمة. رائع لتحويل الملاحظات الدراسية إلى واجبات مكتوبة كاملة.' },
  'extract-key-ideas': { en: 'Identify and extract the core ideas, themes, and arguments from any text. Essential for research, studying, and critical analysis of academic content.', ar: 'حدد واستخرج الأفكار الجوهرية والمحددة من أي نص. ضروري للبحث والدراسة والتحليل النقدي للمحتوى الأكاديمي.' },
  'generate-mcqs': { en: 'Generate multiple choice questions from any study material. Perfect for creating practice tests, self-assessments, and exam preparation materials.', ar: 'أنشئ أسئلة اختيار من متعدد من أي مادة دراسية. مثالي لإنشاء اختبارات تدريبية وتقييمات ذاتية ومواد إعداد الامتحانات.' },
  'generate-tf': { en: 'Create true/false questions from your study content. Quickly build knowledge checks and revision quizzes to test your understanding.', ar: 'أنشئ أسئلة صح أو خطأ من محتوى دراستك. أنشئ اختبارات فهم ومراجعات سريعة لاختبار فهمك بسرعة.' },
  'generate-flashcards': { en: 'Auto-generate study flashcards from any text or document. Supports both sides with questions and answers for effective memorization and recall.', ar: 'أنشئ بطاقات تعليمية تلقائياً من أي نص أو مستند. يدعم كلا الجانبين بالأسئلة والإجابات للتذكر والاستدعاء الفعال.' },
  'generate-quiz': { en: 'Create a complete, multi-format quiz from any study material. Includes various question types to test different levels of understanding.', ar: 'أنشئ اختباراً كاملاً بتنسيقات متعددة من أي مادة دراسية. يتضمن أنواع أسئلة مختلفة لمستويات فهم مختلفة.' },
  'generate-study-plan': { en: 'Get a personalized study plan based on your goals, timeline, and available time. Includes daily schedules, priorities, and progress tracking.', ar: 'احصل على خطة دراسة مخصصة بناءً على أهدافك والجدول الزمني والوقت المتاح. تتضمن جداول يومية وأولويات وتتبع التقدم.' },
  'generate-mindmap': { en: 'Transform text content into visual mind maps that organize information hierarchically. Perfect for understanding complex topics and their relationships.', ar: 'حوّل المحتوى النصي إلى خرائط ذهنية بصرية تنظّم المعلومات هرمياً. مثالي لفهم المواضيع المعقدة والعلاقات بينها.' },
  'extract-terminology': { en: 'Extract key terms, definitions, and specialized vocabulary from academic texts. Ideal for building glossaries or studying subject-specific language.', ar: 'استخرج المصطلحات والتعريفات والمفردات المتخصصة من النصوص الأكاديمية. مثالي لإنشاء قوائم مصطلحات أو دراسة لغة تخصصية.' },
  'explain-terminology': { en: 'Get clear, simple explanations of complex technical or academic terms. Understand difficult concepts without searching through textbooks.', ar: 'احصل على شروحات واضحة وبسيطة للمصطلحات التقنية أو الأكاديمية المعقدة. افهم المفاهيم الصعبة دون البحث في الكتب.' },
  'simplify-paper': { en: 'Simplify complex academic papers to make them easier to understand. Preserve core findings and arguments while reducing jargon and complexity.', ar: 'بسّط الأوراق الأكاديمية المعقدة لجعلها أسهل في الفهم. احتفظ بالنتائج والحجج الأساسية مع تقليل المصطلحات التقنية والتعقيد.' },

  // POWERPOINT
  'generate-ppt-text': { en: 'Create professional PowerPoint presentations from plain text content. AI automatically structures slides, adds key points, and designs layouts.', ar: 'أنشئ عروض PowerPoint التقديمية الاحترافية من محتوى نصي عادي. ي هيكل الشرائح تلقائياً ويضيف النقاط الرئيسية ويصمم التخطيطات بالذكاء الاصطناعي.' },
  'generate-ppt-pdf': { en: 'Convert PDF documents into PowerPoint presentations. Extract content, structure it into slides, and create a visually appealing presentation.', ar: 'حوّل مستندات PDF إلى عروض PowerPoint التقديمية. استخرج المحتوى، هيّكه إلى شرائح، وأنشئ عرضاً تقديمياً جذاباً بصرياً.' },
  'generate-ppt-word': { en: 'Transform Word documents into polished PowerPoint presentations. Automatically extract headings, bullet points, and key information for slides.', ar: 'حوّل مستندات Word إلى عروض PowerPoint التقديمية المصقولة. استخرج العناوين والنقاط الرئيسية والمعلومات المهمة للشرائح تلقائياً.' },
  'generate-ppt-research': { en: 'Create research presentation slides with proper academic structure. Includes introduction, methodology, results, discussion, and conclusion sections.', ar: 'أنشئ شرائح عرض تقديمي بحثية بهيكل أكاديمي صحيح. يتضمن أقسام المقدمة والمنهجية والنتائج والمناقشة والخاتمة.' },
  'extract-ppt-text': { en: 'Extract all text content from PowerPoint files for review, editing, or repurposing. Get clean, formatted text from every slide.', ar: 'استخرج جميع المحتوى النصي من ملفات PowerPoint للمراجعة أو التعديل أو إعادة الاستخدام. احصل على نص منظّف ومُنسّق من كل شريحة.' },
  'convert-ppt-pdf': { en: 'Convert PowerPoint presentations to PDF format for easy sharing, printing, and archiving. Preserves all visual elements and formatting.', ar: 'حوّل عروض PowerPoint التقديمية إلى صيغة PDF للمشاركة والطباعة والأرشفة بسهولة. يحافظ على جميع العناصر البصرية والتنسيق.' },
  'improve-slides': { en: 'AI-powered improvement of your existing PowerPoint slides. Enhance design, layout, content organization, and visual appeal with smart suggestions.', ar: 'تحسين شرائح PowerPoint التقديمية الحالية بالذكاء الاصطناعي. حسّن التصميم والتخطيط وتنظيم المحتوى والجاذبية البصرية بمقترحات ذكية.' },
  'add-images-slides': { en: 'Automatically add relevant, high-quality images to your presentation slides. AI selects images that complement your content and message.', ar: 'أضف صوراً عالية الجودة ذات صلة تلقائياً إلى شرائح عرضك التقديمي. يختار الذكاء الاصطناعي صوراً تكمّل محتواك ورسالتك.' },
  'generate-speaker-notes': { en: 'Generate comprehensive speaker notes for your presentation slides. Includes talking points, transitions, and timing suggestions for smooth delivery.', ar: 'أنشئ ملاحظات متحدث شاملة لشرائح عرضك التقديمي. تتضمن نقاط الحديث والتنقلات واقتراحات التوقيت لتقديم سلس.' },

  // VIDEO
  'extract-audio-video': { en: 'Extract the audio track from any video file and save it as a standalone audio file. Perfect for saving lectures, podcasts, or music from videos.', ar: 'استخرج المسار الصوتي من أي ملف فيديو واحفظه كملف صوتي مستقل. مثالي لحفظ المحاضرات أو البودكاست أو الموسيقى من الفيديوهات.' },
  'compress-video': { en: 'Reduce video file sizes while maintaining quality. Compress large lecture recordings or project videos for easier storage and faster sharing.', ar: 'قلّل أحجام ملفات الفيديو مع الحفاظ على الجودة. اضغط تسجيلات المحاضرات الكبيرة أو فيديوهات المشاريع للتخزين الأسهل والمشاركة الأسرع.' },
  'convert-video': { en: 'Convert videos between different formats like MP4, AVI, MKV, and more. Ensure compatibility with any device or platform.', ar: 'حوّل الفيديوهات بين صيغ مختلفة مثل MP4 وAVI وMKV والمزيد. تأكد من التوافق مع أي جهاز أو منصة.' },
  'video-to-audio': { en: 'Extract audio from video files and save as MP3, WAV, or other audio formats. Great for creating audio versions of video lectures.', ar: 'استخرج الصوت من ملفات الفيديو واحفظه كـ MP3 أو WAV أو صيغ صوتية أخرى. رائع لإنشاء نسخ صوتية من محاضرات الفيديو.' },

  // IMAGES
  'bg-remove': { en: 'Automatically remove backgrounds from images using AI. Create clean, professional-looking photos for presentations, documents, or profiles.', ar: 'أزل الخلفيات من الصور تلقائياً باستخدام الذكاء الاصطناعي. أنشئ صوراً نظيفة واحترافية للمستندات أو العروض التقديمية أو الملفات الشخصية.' },
  'rotate-image': { en: 'Rotate images to any angle with precision. Fix orientation issues from scanned documents or camera captures instantly.', ar: 'دوّر الصور بأي زاوية بدقة. صحّح مشاكل التأطير من المستندات الممسوحة ضوئياً أو لقطات الكاميرا فوراً.' },
  'blur-image': { en: 'Apply blur effects to parts or whole images. Protect privacy by blurring sensitive information or create artistic background effects.', ar: 'طبّع تأثيرات الضبابية على أجزاء أو الصورة كاملة. حمّ الخصوصية بتعتيم المعلومات الحساسة أو أنشئ تأثيرات خلفية فنية.' },
  'images-to-pdf': { en: 'Convert multiple images into a single PDF document. Arrange pages, set margins, and create professional-looking PDFs from your photos.', ar: 'حوّل صور متعددة إلى مستند PDF واحد. رتّب الصفحات، حدد الهوامش، وأنشئ ملفات PDF احترافية من صورك.' },

  // AUDIO
  'speech-to-text': { en: 'Transcribe audio recordings into accurate text using advanced speech recognition. Perfect for converting lectures, interviews, or meetings into written notes.', ar: 'نسخ التسجيلات الصوتية إلى نص دقيق باستخدام التعرف على الكلام المتقدم. مثالي لتحويل المحاضرات أو المقابلات أو الاجتماعات إلى ملاحظات مكتوبة.' },

  // QR CODE
  'qr-generator': { en: 'Generate QR codes from text, URLs, contact info, or any data. Download in various sizes for printing on documents, posters, or business cards.', ar: 'أنشئ رموز QR من نص أو روابط أو معلومات اتصال أو أي بيانات. حمّل بأحجام مختلفة للطباعة على المستندات أو الملصقات أو بطاقات العمل.' },
};

const VALID_CATEGORIES: ToolCategory[] = [
  'pdf', 'ai', 'powerpoint', 'video', 'audio', 'images',
  'qrcode', 'general', 'medical', 'engineering',
];

export default function CategoryDetailPage() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
  const isAr = lang === 'ar';

  if (!category || !VALID_CATEGORIES.includes(category as ToolCategory)) {
    return (
      <div className="max-w-6xl mx-auto pb-16 text-center py-20">
        <AlertCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {isAr ? 'فئة غير موجودة' : 'Category Not Found'}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          {isAr ? 'الفئة التي تبحث عنها غير موجودة.' : 'The category you are looking for does not exist.'}
        </p>
        <Button
          onClick={() => navigate('/our-tools')}
          variant="primary"
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          {isAr ? 'العودة لكل الأدوات' : 'Back to All Tools'}
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
        initial={{ opacity: 0, x: isAr ? 12 : -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <button
          onClick={() => navigate('/our-tools')}
          className="inline-flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors font-medium"
        >
          <ArrowLeft className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
          {isAr ? 'العودة لكل الأدوات' : 'Back to All Tools'}
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
            {isAr ? meta.nameAr : meta.name}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-base md:text-lg leading-relaxed"
          >
            {isAr
              ? `${catTools.length} أداة متاحة`
              : `${catTools.length} tools available`}
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
              {isAr ? 'لا توجد أدوات متاحة في هذا القسم بعد.' : 'No tools available in this category yet.'}
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
                          {isAr ? tool.nameAr : tool.name}
                        </h3>
                        {tool.comingSoon && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-semibold uppercase tracking-wide">
                            <Sparkles className="w-2.5 h-2.5" />
                            {isAr ? 'قريبًا' : 'Coming Soon'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {detail ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed pl-14">
                      {isAr ? detail.ar : detail.en}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed pl-14">
                      {isAr ? tool.descriptionAr : tool.description}
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
          {isAr ? 'استكشف فئات أخرى' : 'Explore More Categories'}
        </h2>
        <p className="text-primary-100 max-w-md mx-auto mb-8 text-sm md:text-base">
          {isAr
            ? 'مورفن للطلاب يقدم مجموعة أدوات شاملة.'
            : 'Morven for Students provides a comprehensive set of tools.'}
        </p>
        <Button
          onClick={() => navigate('/our-tools')}
          variant="secondary"
          size="lg"
          icon={<ArrowLeft className="w-5 h-5" />}
          iconRight={undefined}
          className="bg-white text-primary-700 hover:bg-gray-100 dark:bg-gray-900 dark:text-primary-300 dark:hover:bg-gray-800"
        >
          {isAr ? 'العودة لكل الأدوات' : 'Back to All Tools'}
        </Button>
      </motion.section>
    </div>
  );
}
