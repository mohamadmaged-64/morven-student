import type { ToolCategory } from '@/types';
import type { LucideIcon } from "lucide-react";

export interface Tool {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: LucideIcon;
  category: ToolCategory;
  comingSoon?: boolean;
}

export interface CategoryMeta {
  name: string;
  nameAr: string;
  icon: LucideIcon;
  
}

import {
  FileText, FileImage, Brain, Presentation, Video, Mic, Image as ImageIcon, QrCode, 
  GraduationCap, HeartPulse, File, FileSpreadsheet, Paperclip, Scissors, 
  Minimize2, Trash2, Shuffle, RotateCw, Lock, Unlock, Droplet, PenTool, 
  Search, Printer, ArrowLeftRight, FileSearch, ClipboardList, PlaySquare, 
  Music, Lightbulb, Pen, CheckCircle, Globe, List, Newspaper, Key, 
  HelpCircle, Zap, Layers, BookOpenCheck, CalendarDays, BrainCircuit, 
  Book, Type, ScrollText, Microscope, Sparkles, Smartphone, Timer, 
  ListTodo, Calendar, ClipboardPlus, FileArchive,  ArrowUpDown, Droplets, Signature, ScanSearch, ScanText, GitCompare, Stethoscope, Scale, Pill, FlaskConical, FileHeart,
  Cog
} from "lucide-react";

export const icon = {
    FileText, FileImage, Brain, Presentation, Video, Mic, ImageIcon, QrCode, 
  GraduationCap, HeartPulse, File, FileSpreadsheet, Paperclip, Scissors, 
  Minimize2, Trash2, Shuffle, RotateCw, Lock, Unlock, Droplet, PenTool, 
  Search, Printer, ArrowLeftRight, FileSearch, ClipboardList, PlaySquare, 
  Music, Lightbulb, Pen, CheckCircle, Globe, List, Newspaper, Key, 
  HelpCircle, Zap, Layers, BookOpenCheck, CalendarDays, BrainCircuit, 
  Book, Type, ScrollText, Microscope, Sparkles, Smartphone, Timer, 
  ListTodo, Calendar, ClipboardPlus, FileArchive,  ArrowUpDown, Droplets, Signature, ScanSearch, ScanText, GitCompare, Stethoscope, Scale, Pill, FlaskConical, FileHeart

}

export const tools: Tool[] = [
  // OFFICE
{ id: 'word-to-pdf', name: 'Word to PDF', nameAr: 'Word إلى PDF', description: 'Convert Word documents to PDF format', descriptionAr: 'تحويل مستندات Word إلى صيغة PDF', icon: FileText, category: 'office' },
{ id: 'excel-to-pdf', name: 'Excel to PDF', nameAr: 'Excel إلى PDF', description: 'Convert Excel spreadsheets to PDF', descriptionAr: 'تحويل جداول Excel إلى PDF', icon: FileSpreadsheet, category: 'office' },
{ id: 'ppt-to-pdf', name: 'PPT to PDF', nameAr: 'PPT إلى PDF', description: 'Convert PowerPoint presentations to PDF', descriptionAr: 'تحويل عروض PowerPoint إلى PDF', icon: Presentation, category: 'office' },
{ id: 'merge-pdfs', name: 'Merge PDF', nameAr: 'دمج PDF', description: 'Combine multiple PDF files into a single document', descriptionAr: 'دمج ملفات PDF متعددة في مستند واحد', icon: Paperclip, category: 'office' },
{ id: 'split-pdf', name: 'Split PDF', nameAr: 'تقسيم PDF', description: 'Split a PDF file into separate pages or ranges', descriptionAr: 'تقسيم ملف PDF إلى صفحات أو نطاقات منفصلة', icon: Scissors, category: 'office' },
{ id: 'compress-pdf', name: 'Compress PDF', nameAr: 'ضغط PDF', description: 'Reduce PDF file size without losing quality', descriptionAr: 'تقليل حجم ملف PDF دون فقدان الجودة', icon: FileArchive, category: 'office' },
{ id: 'delete-pages', name: 'Delete Pages', nameAr: 'حذف صفحات', description: 'Remove unwanted pages from a PDF document', descriptionAr: 'إزالة الصفحات غير المرغوب فيها من مستند PDF', icon: Trash2, category: 'office' },
{ id: 'reorder-pages', name: 'Reorder Pages', nameAr: 'إعادة ترتيب الصفحات', description: 'Rearrange pages in a PDF document', descriptionAr: 'إعادة ترتيب الصفحات في مستند PDF', icon: ArrowUpDown, category: 'office', comingSoon: true },
{ id: 'rotate-pages', name: 'Rotate Pages', nameAr: 'تدوير الصفحات', description: 'Rotate individual pages in a PDF', descriptionAr: 'تدوير صفحات فردية في PDF', icon: RotateCw, comingSoon: true, category: 'office' },
{ id: 'password-protect', name: 'Password Protect', nameAr: 'حماية بكلمة مرور', description: 'Add password protection to PDF files', descriptionAr: 'إضافة حماية بكلمة مرور لملفات PDF', icon: Lock,comingSoon: true, category: 'office' },
{ id: 'remove-password', name: 'Remove Password', nameAr: 'إزالة كلمة المرور', description: 'Remove password protection from PDF files', descriptionAr: 'إزالة حماية كلمة المرور من ملفات PDF', icon: Unlock, comingSoon: true, category: 'office' },
{ id: 'add-watermark', name: 'Add Watermark', nameAr: 'إضافة علامة مائية', description: 'Add text or image watermarks to PDF files', descriptionAr: "إضافة علامات مائية نصية أو صور إلى ملفات PDF", icon: Droplets, comingSoon: true, category: "office" },
{ id:'add-signature', name:'Add Signature', nameAr:'إضافة توقيع', description:'Add digital signatures to PDF documents', descriptionAr: 'إضافة توقيعات رقمية إلى مستندات PDF', icon:Signature, comingSoon: true, category:'office' },
{ id:'extract-images', name:'Extract Images', nameAr:'استخراج الصور', description:'Extract images from PDF files', descriptionAr: 'استخراج الصور من ملفات PDF', icon: ImageIcon, comingSoon: true, category:'office' },
{ id:'ocr', name:'OCR', nameAr:'التعرف الضوئي', description:'Optical character recognition for scanned PDFs', descriptionAr:'التعرف البصري على الأحرف لملفات PDF الممسوحة ضوئياً', icon:ScanSearch, comingSoon: true, category:'office' },
{ id: 'scan-to-text', name: 'Scan to Text', nameAr: 'مسح إلى نص', description: 'Convert scanned documents and images to editable text', descriptionAr: 'تحويل المستندات والصور الممسوحة ضوئياً إلى نص قابل للتعديل', icon: ScanText,comingSoon: true,  category: 'office' },
{ id: 'compare-pdfs', name: 'Compare PDFs', nameAr: 'مقارنة PDF', description: 'Compare two PDF files and highlight differences', descriptionAr: 'مقارنة ملفي PDF وإبراز الاختلافات', icon: GitCompare, comingSoon: true, category: 'office' },
 // AI
{ id: 'summarize-text', name: 'Summarize Text', nameAr: 'تلخيص نص', description: 'AI-powered text summarization', descriptionAr: 'تلخيص النصوص بالذكاء الاصطناعي', icon: ScrollText, comingSoon: true, category: 'ai' },
{ id: 'summarize-pdf', name: 'Summarize PDF', nameAr: 'تلخيص PDF', description: 'Summarize PDF documents with AI', descriptionAr: 'تلخيص مستندات PDF بالذكاء الاصطناعي', icon: FileText, category: 'ai' },
{ id: 'summarize-word', name: 'Summarize Word', nameAr: 'تلخيص Word', description: 'Summarize Word documents with AI', descriptionAr: 'تلخيص مستندات Word بالذكاء الاصطناعي', icon: FileText, category: 'ai' },
{ id: 'summarize-ppt', name: 'Summarize PPT', nameAr: 'تلخيص PPT', description: 'Summarize PowerPoint presentations with AI', descriptionAr: 'تلخيص عروض PowerPoint بالذكاء الاصطناعي', icon: Presentation, category: 'ai' },
{ id: 'summarize-images', name: 'Summarize Images', nameAr: 'تلخيص الصور', description: 'Extract and summarize text from images', descriptionAr: 'استخراج وتلخيص النص من الصور', icon: FileImage, comingSoon: true, category: 'ai' },
{ id: 'summarize-youtube', name: 'Summarize YouTube', nameAr: 'تلخيص يوتيوب', description: 'Summarize YouTube video content', descriptionAr: 'تلخيص محتوى فيديوهات يوتيوب', icon: PlaySquare, comingSoon: true, category: 'ai' },
{ id: 'summarize-audio', name: 'Summarize Audio', nameAr: 'تلخيص الصوت', description: 'Transcribe and summarize audio recordings', descriptionAr: 'نسخ وتلخيص التسجيلات الصوتية', icon: Music, comingSoon: true, category: 'ai' },
{ id: 'explain-simply', name: 'Explain Simply', nameAr: 'شرح مبسط', description: 'Explain complex topics in simple terms', descriptionAr: 'شرح المواضيع المعقدة بعبارات بسيطة', icon: Lightbulb, comingSoon: true, category: 'ai' },
{ id: 'rewrite-text', name: 'Rewrite Text', nameAr: 'إعادة كتابة النص', description: 'Rewrite text in different styles and tones', descriptionAr: 'إعادة كتابة النص بأساليب ونغمات مختلفة', icon: Pen, comingSoon: true, category: 'ai' },
{ id: 'grammar-check', name: 'Grammar Check', nameAr: 'تدقيق نحوي', description: 'Check and correct grammar and spelling errors', descriptionAr: 'التحقق وتصحيح أخطاء القواعد والإملاء', icon: CheckCircle,comingSoon: true, category: 'ai' },
{ id: 'translate', name: 'Translate', nameAr: 'ترجمة', description: 'Translate text between multiple languages', descriptionAr: 'ترجمة النصوص بين لغات متعددة', icon: Globe, category: 'ai' },
{ id: 'paragraph-to-bullets', name: 'Paragraph to Bullets', nameAr: 'فقرة إلى نقاط', description: 'Convert paragraphs into bullet point summaries', descriptionAr: 'تحويل الفقرات إلى نقاط تلخيصية', icon: List, comingSoon: true, category: 'ai' },
{ id: 'bullets-to-article', name: 'Bullets to Article', nameAr: 'نقاط إلى مقال', description: 'Expand bullet points into a full article', descriptionAr: 'توسيع النقاط إلى مقال كامل', icon: Newspaper, comingSoon: true, category: 'ai' },
{ id: 'extract-key-ideas', name: 'Extract Key Ideas', nameAr: 'استخراج الأفكار الرئيسية', description: 'Identify and extract key ideas from text', descriptionAr: 'تحديد واستخراج الأفكار الرئيسية من النص', icon: Key, comingSoon: true, category: 'ai' },
{ id: 'generate-mcqs', name: 'Generate MCQs', nameAr: 'إنشاء أسئلة اختيار', description: 'Generate multiple choice questions from content', descriptionAr: 'إنشاء أسئلة اختيار من متعدد من المحتوى', icon: HelpCircle, comingSoon: true, category: 'ai' },
{ id: 'generate-tf', name: 'Generate True/False', nameAr: 'إنشاء صح/خطأ', description: 'Generate true/false questions from content', descriptionAr: 'إنشاء أسئلة صح أو خطأ من المحتوى', icon: Zap, comingSoon: true, category: 'ai' },
{ id: 'generate-flashcards', name: 'Generate Flashcards', nameAr: 'إنشاء بطاقات تعليمية', description: 'Auto-generate flashcards from your study material', descriptionAr: 'إنشاء بطاقات تعليمية تلقائياً من مواد دراستك', icon: Layers, category: 'ai' },
{ id: 'generate-quiz', name: 'Generate Quiz', nameAr: 'إنشاء اختبار', description: 'Create a complete quiz from any content', descriptionAr: 'إنشاء اختبار كامل من أي محتوى', icon: BookOpenCheck, comingSoon: true, category: 'ai' },
{ id: 'generate-study-plan', name: 'Generate Study Plan', nameAr: 'إنشاء خطة دراسة', description: 'Create a personalized study plan', descriptionAr: 'إنشاء خطة دراسة مخصصة', icon: CalendarDays, comingSoon: true, category: 'ai' },
{ id: 'generate-mindmap', name: 'Generate Mind Map', nameAr: 'إنشاء خريطة ذهنية', description: 'Create visual mind maps from text content', descriptionAr: 'إنشاء خرائط ذهنية مرئية من المحتوى النصي', icon: BrainCircuit, comingSoon: true, category: 'ai' },
{ id: 'extract-terminology', name: 'Extract Terminology', nameAr: 'استخراج المصطلحات', description: 'Extract key terms and definitions from content', descriptionAr: 'استخراج المصطلحات والتعريفات الرئيسية من المحتوى', icon: Book, comingSoon: true, category: 'ai' },
{ id: 'explain-terminology', name: 'Explain Terminology', nameAr: 'شرح المصطلحات', description: 'Get simple explanations of complex terminology', descriptionAr: 'الحصول على شروحات بسيطة للمصطلحات المعقدة', icon: Type, comingSoon: true, category: 'ai' },
{ id: 'simplify-paper', name: 'Simplify Paper', nameAr: 'تبسيط ورقة بحثية', description: 'Simplify academic papers for better understanding', descriptionAr: 'تبسيط الأوراق الأكاديمية لفهم أفضل', icon: Microscope, comingSoon: true, category: 'ai' },
 // POWERPOINT
{
  id: 'generate-ppt-text',
  name: 'Generate PPT from Text',
  nameAr: 'إنشاء PPT من نص',
  description: 'Create a presentation from text content',
  descriptionAr: 'إنشاء عرض تقديمي من محتوى نصي',
  icon: Presentation,
  category: 'powerpoint'
},
{
  id: 'generate-ppt-pdf',
  name: 'Generate PPT from PDF',
  nameAr: 'إنشاء PPT من PDF',
  description: 'Convert PDF to a PowerPoint presentation',
  descriptionAr: 'تحويل PDF إلى عرض PowerPoint',
  icon: FileText,
  category: 'powerpoint'
},
{
  id: 'generate-ppt-word',
  name: 'Generate PPT from Word',
  nameAr: 'إنشاء PPT من Word',
  description: 'Create a presentation from a Word document',
  descriptionAr: 'إنشاء عرض تقديمي من مستند Word',
  icon: FileText,
  category: 'powerpoint'
},
{
  id: 'generate-ppt-research',
  name: 'Generate Research PPT',
  nameAr: 'إنشاء PPT بحثي',
  description: 'Create research presentation slides',
  descriptionAr: 'إنشاء شرائح عرض تقديمي بحثية',
  icon: Microscope,
  comingSoon: true,
  category: 'powerpoint'
},
{
  id: 'extract-ppt-text',
  name: 'Extract PPT Text',
  nameAr: 'استخراج نص PPT',
  description: 'Extract all text from a PowerPoint file',
  descriptionAr: 'استخراج كل النص من ملف PowerPoint',
  icon: FileSearch,
  comingSoon: true,
  category: 'powerpoint'
},
{
  id: 'convert-ppt-pdf',
  name: 'Convert PPT to PDF',
  nameAr: 'تحويل PPT إلى PDF',
  description: 'Convert PowerPoint to PDF format',
  descriptionAr: 'تحويل PowerPoint إلى صيغة PDF',
  icon: FileText,
  comingSoon: true,
  category: 'powerpoint'
},
{
  id: 'improve-slides',
  name: 'Improve Slides',
  nameAr: 'تحسين الشرائح',
  description: 'AI-powered slide improvement and redesign',
  descriptionAr: 'تحسين وإعادة تصميم الشرائح بالذكاء الاصطناعي',
  icon: Sparkles,
  comingSoon: true,
  category: 'powerpoint'
},
{
  id: 'add-images-slides',
  name: 'Add Images to Slides',
  nameAr: 'إضافة صور للشرائح',
  description: 'Automatically add relevant images to slides',
  descriptionAr: 'إضافة صور ذات صلة تلقائياً إلى الشرائح',
  icon: FileImage,
  comingSoon: true,
  category: 'powerpoint'
},
{
  id: 'generate-speaker-notes',
  name: 'Generate Speaker Notes',
  nameAr: 'إنشاء ملاحظات المتحدث',
  description: 'Generate speaker notes for presentation slides',
  descriptionAr: 'إنشاء ملاحظات المتحدث لشرائح العرض',
  icon: ClipboardList,
  comingSoon: true,
  category: 'powerpoint'
},
 // VIDEO
{ id: 'extract-audio-video', name: 'Extract Audio from Video', nameAr: 'استخراج الصوت من فيديو', description: 'Extract audio track from video files', descriptionAr: 'استخراج المسار الصوتي من ملفات الفيديو', icon: Music,  category: 'video' },
{ id: 'compress-video', name: 'Compress Video', nameAr: 'ضغط الفيديو', description: 'Reduce video file size while maintaining quality', descriptionAr: 'تقليل حجم ملف الفيديو مع الحفاظ على الجودة', icon: Minimize2, comingSoon: true, category: 'video' },
{ id: 'convert-video', name: 'Convert Video', nameAr: 'تحويل الفيديو', description: 'Convert videos between different formats', descriptionAr: 'تحويل الفيديوهات بين صيغ مختلفة', icon: ArrowLeftRight, comingSoon: true, category: 'video' },
{ id: 'video-to-audio', name: 'Video to Audio', nameAr: 'فيديو إلى صوت', description: 'Convert video files to audio formats', descriptionAr: 'تحويل ملفات الفيديو إلى صيغ صوتية', icon: Mic, comingSoon: true, category: 'video' },

// AUDIO
{ id: 'speech-to-text', name: 'Speech to Text', nameAr: 'صوت إلى نص', description: 'Transcribe audio recordings to text', descriptionAr: 'تحويل التسجيلات الصوتية إلى نص', icon: Mic, category: 'audio' },

// IMAGES
{ id: 'bg-remove', name: 'Background Remover', nameAr: 'إزالة الخلفية', description: 'Remove background from images automatically', descriptionAr: 'إزالة الخلفية من الصور تلقائياً', icon: Scissors, comingSoon: true, category: 'images' },
{ id: 'rotate-image', name: 'Rotate Image', nameAr: 'تدوير الصورة', description: 'Rotate images to any angle', descriptionAr: 'تدوير الصور بأي زاوية', icon: RotateCw, comingSoon: true, category: 'images' },
{ id: 'blur-image', name: 'Blur Image', nameAr: 'تعتيم الصورة', description: 'Blur parts or whole images', descriptionAr: 'تعتيم أجزاء أو الصورة كاملة', icon: Droplet, comingSoon: true, category: 'images' },
{ id: 'images-to-pdf', name: 'Images to PDF', nameAr: 'صور إلى PDF', description: 'Convert multiple images into a PDF document', descriptionAr: 'تحويل صور متعددة إلى مستند PDF', icon: FileImage, comingSoon: true, category: 'images' },

// QR CODE
{ id: 'qr-generator', name: 'QR Generator', nameAr: 'مولد QR', description: 'Generate QR codes from text, URLs, or data', descriptionAr: 'إنشاء رموز QR من نص أو روابط أو بيانات', icon: QrCode, category: 'qrcode' },

// STUDENT
{ id: 'pomodoro', name: 'Pomodoro Timer', nameAr: 'مؤقت بومودورو', description: 'Boost productivity with timed study sessions', descriptionAr: 'تعزيز الإنتاجية بجلسات دراسة محددة الوقت', icon: Timer, category: 'student' },
{ id: 'task-manager', name: 'Task Manager', nameAr: 'مدير المهام', description: 'Organize and track your study tasks', descriptionAr: 'تنظيم وتتبع مهام دراستك', icon: ListTodo, category: 'student' },
{ id: 'exam-countdown', name: 'Exam Countdown', nameAr: 'عد تنازلي للامتحان', description: 'Track days remaining until your exams', descriptionAr: 'تتبع الأيام المتبقية حتى امتحاناتك', icon: Calendar, category: 'student' },

// MEDICAL
{ id: 'medical-summarizer', name: 'Medical Summarizer', nameAr: 'ملخص طبي', description: 'Summarize medical texts and articles', descriptionAr: 'تلخيص النصوص والمقالات الطبية', icon: FileHeart, comingSoon: true, category: 'medical' },
{ id: 'medical-flashcards', name: 'Medical Flashcards', nameAr: 'بطاقات طبية', description: 'Pre-made medical study flashcards', descriptionAr: 'بطاقات دراسية طبية جاهزة', icon: BookOpenCheck, comingSoon: true, category: 'medical' },
{ id: 'medical-mcq', name: 'Medical MCQ', nameAr: 'أسئلة طبية اختيار', description: 'Generate medical multiple choice questions', descriptionAr: 'إنشاء أسئلة اختيار من متعدد طبية', icon: HelpCircle, comingSoon: true, category: 'medical' },
{ id: 'disease-explain', name: 'Disease Explainer', nameAr: 'شرح الأمراض', description: 'Get simple explanations of diseases and conditions', descriptionAr: 'الحصول على شروحات بسيطة للأمراض والحالات', icon: Stethoscope, comingSoon: true, category: 'medical' },
{ id: 'disease-compare', name: 'Disease Comparator', nameAr: 'مقارنة الأمراض', description: 'Compare different diseases side by side', descriptionAr: 'مقارنة الأمراض المختلفة جنباً إلى جنب', icon: Scale, comingSoon: true, category: 'medical' },
{ id: 'drug-summary', name: 'Drug Summary', nameAr: 'مرجع الأدوية', description: 'Quick access to drug information and interactions', descriptionAr: 'وصول سريع لمعلومات الأدوية والتفاعلات', icon: Pill, comingSoon: true, category: 'medical' },
{ id: 'lab-values', name: 'Lab Values', nameAr: 'قيم المختبر', description: 'Reference for normal lab values and ranges', descriptionAr: 'مرجع للقيم المختبرية الطبيعية ونطاقاتها', icon: FlaskConical, comingSoon: true, category: 'medical' },
{ id: 'medical-notes', name: 'Medical Notes', nameAr: 'ملاحظات طبية', description: 'Template-based clinical note taking', descriptionAr: 'تدوين الملاحظات السريرية بالقوالب', icon: ClipboardPlus, comingSoon: true, category: 'medical' },
]
export function getToolsByCategory(category: ToolCategory): Tool[] {
  return tools.filter((t) => t.category === category);
}

export function getToolById(id: string): Tool | undefined {
  return tools.find((t) => t.id === id);
}

export function searchTools(query: string): Tool[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return tools.filter(
    (t) =>
      t.id.includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.nameAr.includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.descriptionAr.includes(q),
  );
}
export const categories: Record<ToolCategory, CategoryMeta> = {
  office: {
    name: "Office & PDF",
    nameAr: "Office و PDF",
    icon: FileText,
  },
  ai: {
    name: "AI Study Tools",
    nameAr: "أدوات الذكاء الاصطناعي",
    icon: Brain,
  },
  powerpoint: {
    name: "PowerPoint",
    nameAr: "PowerPoint",
    icon: Presentation,
  },
  video: {
    name: "Video",
    nameAr: "الفيديو",
    icon: Video,
  },
  audio: {
    name: "Audio",
    nameAr: "الصوت",
    icon: Mic,
  },
  images: {
    name: "Images",
    nameAr: "الصور",
    icon: ImageIcon,
  },
  qrcode: {
    name: "QR Code",
    nameAr: "QR Code",
    icon: QrCode,
  },
  student: {
    name: "Student Tools",
    nameAr: "أدوات الطالب",
    icon: GraduationCap,
  },
  medical: {
    name: "Medical Student",
    nameAr: "طالب الطب",
    icon: HeartPulse,
  },
  engineering: {
    name: "Engineering Tools",
    nameAr: "أدوات الهندسة",
    icon: Cog,
  },
};
export const categoryOrder: ToolCategory[] = [
  'office',
  'ai',
  'powerpoint',
  'video',
  'audio',
  'images',
  'qrcode',
  'student',
  'medical',
];
export function getCategoryInfo(category: ToolCategory): CategoryMeta {
  return categories[category];
}
