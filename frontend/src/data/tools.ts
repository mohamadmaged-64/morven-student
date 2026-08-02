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
  FileText, FileImage, Brain, Presentation, Video, Mic, ImageIcon, QrCode,
  GraduationCap, HeartPulse, File, FileSpreadsheet, Paperclip, Scissors,
  Minimize2, Trash2, Shuffle, RotateCw, Lock, Unlock, Droplet, PenTool,
  Search, Printer, ArrowLeftRight, FileSearch, ClipboardList, PlaySquare,
  Music, Lightbulb, Pen, CheckCircle, Globe, List, Newspaper, Key,
  HelpCircle, Zap, Layers, BookOpenCheck, CalendarDays, BrainCircuit,
  Book, Type, ScrollText, Microscope, Sparkles, Smartphone, Timer,
  ListTodo, Calendar, ClipboardPlus, FileArchive, ArrowUpDown, Droplets, Signature, ScanSearch, ScanText, GitCompare, Stethoscope, Scale, Pill, FlaskConical, FileHeart,
  Cog,Combine, Archive, Hash, NotebookPen,
  Braces, Regex, KeyRound, Fingerprint, Palette, Code2, FileCode2, Wand2, Table,
  FileCode, Link, Server, Gauge, Route, Database, Box, Boxes, Table2, Grid3x3,
  GitBranch, Terminal, Cloud, AtSign, Columns, Clock, Barcode, Quote, ListChecks,
  CalendarClock, ShieldCheck, BadgeCheck, LockKeyhole, Shield
} from "lucide-react";

export const icon = {
  FileText, FileImage, Brain, Presentation, Video, Mic, ImageIcon, QrCode,
  GraduationCap, HeartPulse, File, FileSpreadsheet, Paperclip, Scissors,
  Minimize2, Trash2, Shuffle, RotateCw, Lock, Unlock, Droplet, PenTool,
  Search, Printer, ArrowLeftRight, FileSearch, ClipboardList, PlaySquare,
  Music, Lightbulb, Pen, CheckCircle, Globe, List, Newspaper, Key,
  HelpCircle, Zap, Layers, BookOpenCheck, CalendarDays, BrainCircuit,
  Book, Type, ScrollText, Microscope, Sparkles, Smartphone, Timer,
  ListTodo, Calendar, ClipboardPlus, FileArchive, ArrowUpDown, Droplets, Signature, ScanSearch, ScanText, GitCompare, Stethoscope, Scale, Pill, FlaskConical, FileHeart,
  Cog,Combine, Archive, Hash, NotebookPen

}

export const tools: Tool[] = [
  // GENERAL
  { id: 'holy-quran', name: 'Holy Quran', nameAr: 'القرآن الكريم', description: 'The best way to begin your study session is with the words of Allah; they bring peace to the soul, blessings to knowledge, and help you stay focused.', descriptionAr: 'خيرُ ما تُستفتح به دراستك هو كلامُ الله؛ فهو سكينةٌ للروح، وبركةٌ في العلم، وعونٌ على التركيز.', icon: Book, category: 'general' },
  { id: 'task-manager', name: 'Task Manager', nameAr: 'مدير المهام', description: 'Organize and track your study tasks', descriptionAr: 'تنظيم وتتبع مهام دراستك', icon: ListTodo, category: 'general' },
  { id: 'notes', name: 'Notes', nameAr: 'الملاحظات', description: 'Quickly create and organize your notes with automatic saving', descriptionAr: 'أنشئ واحفظ ملاحظاتك بسرعة مع حفظ تلقائي', icon: NotebookPen, category: 'general' },
  { id: 'pomodoro-timer', name: 'Pomodoro Timer', nameAr: 'مؤقت بومودورو', description: 'Boost productivity with timed study sessions', descriptionAr: 'تعزيز الإنتاجية بجلسات دراسة محددة الوقت', icon: Timer, category: 'general' },
  { id: 'exam-countdown', name: 'Exam Countdown', nameAr: 'عد تنازلي للامتحان', description: 'Track days remaining until your exams', descriptionAr: 'تتبع الأيام المتبقية حتى امتحاناتك', icon: Calendar, category: 'general' },
  
  // MEDICAL
  { id: 'disease-explain', name: 'Disease Explainer', nameAr: 'شرح الأمراض', description: 'Get simple explanations of diseases and conditions', descriptionAr: 'الحصول على شروحات بسيطة للأمراض والحالات', icon: Stethoscope, category: 'medical' },
  { id: 'drug-summary', name: 'Drug Summary', nameAr: 'مرجع الأدوية', description: 'Quick access to drug information and interactions', descriptionAr: 'وصول سريع لمعلومات الأدوية والتفاعلات', icon: Pill, category: 'medical' },
  { id: 'lab-values', name: 'Lab Values', nameAr: 'قيم المختبر', description: 'Reference for normal lab values and ranges', descriptionAr: 'مرجع للقيم المختبرية الطبيعية ونطاقاتها', icon: FlaskConical, category: 'medical' },
  { id: 'medical-notes', name: 'Medical Notes', nameAr: 'ملاحظات طبية', description: 'Template-based clinical note taking', descriptionAr: 'تدوين الملاحظات السريرية بالقوالب', icon: ClipboardPlus, category: 'medical' },
   { id: 'medical-flashcards', name: 'Medical Flashcards', nameAr: 'بطاقات طبية', description: 'Pre-made medical study flashcards', descriptionAr: 'بطاقات دراسية طبية جاهزة', icon: BookOpenCheck, category: 'medical' },
  { id: 'medical-mcq', name: 'Medical MCQ', nameAr: 'أسئلة طبية اختيار من متعدد', description: 'Generate medical multiple choice questions', descriptionAr: 'إنشاء أسئلة اختيار من متعدد طبية', icon: HelpCircle, category: 'medical' },
 
  // ENGINEERING
  // Code Tools
  { id: 'json-formatter', name: 'JSON Formatter', nameAr: 'منسق JSON', description: 'Format, validate, and beautify JSON data', descriptionAr: 'تنسيق والتحقق من بيانات JSON وتجميلها', icon: Braces, category: 'engineering' },
  { id: 'json-validator', name: 'JSON Validator', nameAr: 'مدقق JSON', description: 'Validate JSON data and get detailed error reports', descriptionAr: 'التحقق من بيانات JSON مع تقارير أخطاء مفصلة', icon: CheckCircle, category: 'engineering' },
  { id: 'regex-tester', name: 'Regex Tester', nameAr: 'اختبار التعبيرات النمطية', description: 'Test regular expressions against sample text', descriptionAr: 'اختبار التعبيرات النمطية على نص تجريبي', icon: Regex, category: 'engineering' },
  { id: 'uuid-generator', name: 'UUID Generator', nameAr: 'مولد UUID', description: 'Generate random UUID v4 identifiers', descriptionAr: 'توليد معرفات UUID عشوائية v4', icon: Hash, category: 'engineering' },
  { id: 'base64-encoder', name: 'Base64 Encoder/Decoder', nameAr: 'ترميز Base64', description: 'Encode and decode Base64 text', descriptionAr: 'ترميز وفك ترميز نص Base64', icon: ArrowLeftRight, category: 'engineering' },
  { id: 'jwt-decoder', name: 'JWT Decoder', nameAr: 'فك ترميز JWT', description: 'Decode and inspect JWT tokens', descriptionAr: 'فك ترميز وفحص رموز JWT', icon: KeyRound, comingSoon: true, category: 'engineering' },
  { id: 'hash-generator', name: 'Hash Generator', nameAr: 'مولد التجزئة', description: 'Generate SHA-1, SHA-256, SHA-384, and SHA-512 hashes', descriptionAr: 'توليد تجزئات SHA-1 وSHA-256 وSHA-384 وSHA-512', icon: Fingerprint, category: 'engineering' },
  { id: 'password-generator', name: 'Password Generator', nameAr: 'مولد كلمات المرور', description: 'Generate strong random passwords', descriptionAr: 'توليد كلمات مرور قوية عشوائية', icon: Lock, category: 'engineering' },
  // Web Development
  { id: 'html-preview', name: 'HTML Preview', nameAr: 'معاينة HTML', description: 'Write HTML and preview it instantly', descriptionAr: 'اكتب HTML وشاهد المعاينة فوراً', icon: Globe, category: 'engineering' },
  { id: 'css-beautifier', name: 'CSS Beautifier', nameAr: 'منسق CSS', description: 'Format and beautify CSS code', descriptionAr: 'تنسيق وتجميل أكواد CSS', icon: Palette, comingSoon: true, category: 'engineering' },
  { id: 'css-minifier', name: 'CSS Minifier', nameAr: 'مصغّر CSS', description: 'Minify CSS to reduce file size', descriptionAr: 'تصغير CSS لتقليل حجم الملف', icon: Minimize2, comingSoon: true, category: 'engineering' },
  { id: 'js-beautifier', name: 'JavaScript Beautifier', nameAr: 'منسق JavaScript', description: 'Format and beautify JavaScript code', descriptionAr: 'تنسيق وتجميل أكواد JavaScript', icon: Code2, comingSoon: true, category: 'engineering' },
  { id: 'js-minifier', name: 'JavaScript Minifier', nameAr: 'مصغّر JavaScript', description: 'Minify JavaScript to reduce file size', descriptionAr: 'تصغير JavaScript لتقليل حجم الملف', icon: FileCode2, comingSoon: true, category: 'engineering' },
  { id: 'svg-viewer', name: 'SVG Viewer', nameAr: 'عارض SVG', description: 'Write SVG and preview it in real time', descriptionAr: 'اكتب SVG وشاهد المعاينة مباشرة', icon: PenTool, category: 'engineering' },
  { id: 'color-picker', name: 'Color Picker', nameAr: 'منتقي الألوان', description: 'Pick colors and get their HEX, RGB, and HSL values', descriptionAr: 'اختر الألوان واحصل على قيم HEX وRGB وHSL', icon: Wand2, category: 'engineering' },
  { id: 'gradient-generator', name: 'Gradient Generator', nameAr: 'مولد التدرجات', description: 'Create beautiful CSS gradients', descriptionAr: 'إنشاء تدرجات CSS جميلة', icon: Sparkles, category: 'engineering' },
  // Data Conversion
  { id: 'json-yaml', name: 'JSON to YAML', nameAr: 'JSON إلى YAML', description: 'Convert between JSON and YAML formats', descriptionAr: 'التحويل بين صيغتي JSON وYAML', icon: Shuffle, comingSoon: true, category: 'engineering' },
  { id: 'json-xml', name: 'JSON to XML', nameAr: 'JSON إلى XML', description: 'Convert between JSON and XML formats', descriptionAr: 'التحويل بين صيغتي JSON وXML', icon: ArrowLeftRight, comingSoon: true, category: 'engineering' },
  { id: 'csv-json', name: 'CSV to JSON', nameAr: 'CSV إلى JSON', description: 'Convert CSV data to JSON and back', descriptionAr: 'تحويل بيانات CSV إلى JSON والعكس', icon: Table, category: 'engineering' },
  { id: 'markdown-html', name: 'Markdown to HTML', nameAr: 'Markdown إلى HTML', description: 'Convert Markdown text to HTML', descriptionAr: 'تحويل نص Markdown إلى HTML', icon: FileText, category: 'engineering' },
  { id: 'html-markdown', name: 'HTML to Markdown', nameAr: 'HTML إلى Markdown', description: 'Convert HTML to Markdown text', descriptionAr: 'تحويل HTML إلى نص Markdown', icon: FileCode, comingSoon: true, category: 'engineering' },
  { id: 'url-encoder', name: 'URL Encode/Decode', nameAr: 'ترميز URL', description: 'Encode and decode URL strings', descriptionAr: 'ترميز وفك ترميز روابط URL', icon: Link, category: 'engineering' },
  // API & Networking
  { id: 'api-tester', name: 'API Tester', nameAr: 'اختبار API', description: 'Test HTTP APIs with custom requests', descriptionAr: 'اختبار واجهات برمجة التطبيقات HTTP بطلبات مخصصة', icon: Server, comingSoon: true, category: 'engineering' },
  { id: 'http-status-codes', name: 'HTTP Status Codes', nameAr: 'أكواد حالة HTTP', description: 'Reference for HTTP status codes', descriptionAr: 'مرجع لأكواد حالة HTTP', icon: Gauge, category: 'engineering' },
  { id: 'http-headers', name: 'HTTP Headers', nameAr: 'ترويسات HTTP', description: 'Reference for common HTTP headers', descriptionAr: 'مرجع لترويسات HTTP الشائعة', icon: ClipboardList, comingSoon: true, category: 'engineering' },
  { id: 'mime-types', name: 'MIME Types', nameAr: 'أنواع MIME', description: 'Reference for common MIME types', descriptionAr: 'مرجع لأنواع MIME الشائعة', icon: Type, comingSoon: true, category: 'engineering' },
  { id: 'rest-methods', name: 'REST Methods', nameAr: 'طرق REST', description: 'Reference for HTTP REST methods', descriptionAr: 'مرجع لطرق HTTP REST', icon: Route, category: 'engineering' },
  // Database
  { id: 'sql-formatter', name: 'SQL Formatter', nameAr: 'منسق SQL', description: 'Format SQL queries for readability', descriptionAr: 'تنسيق استعلامات SQL للقراءة', icon: Database, comingSoon: true, category: 'engineering' },
  { id: 'sql-beautifier', name: 'SQL Beautifier', nameAr: 'مجمل SQL', description: 'Beautify and align SQL statements', descriptionAr: 'تجميل ومحاذاة جمل SQL', icon: Box, comingSoon: true, category: 'engineering' },
  { id: 'sql-playground', name: 'SQL Playground', nameAr: 'بيئة SQL التجريبية', description: 'Experiment with SQL queries', descriptionAr: 'جرّب استعلامات SQL', icon: Boxes, comingSoon: true, category: 'engineering' },
  { id: 'csv-to-sql', name: 'CSV to SQL', nameAr: 'CSV إلى SQL', description: 'Generate SQL INSERT statements from CSV', descriptionAr: 'توليد جمل إدراج SQL من CSV', icon: Table2, category: 'engineering' },
  { id: 'json-to-sql', name: 'JSON to SQL', nameAr: 'JSON إلى SQL', description: 'Generate SQL INSERT statements from JSON', descriptionAr: 'توليد جمل إدراج SQL من JSON', icon: Grid3x3, category: 'engineering' },
  // Developer Reference
  { id: 'git-cheatsheet', name: 'Git Cheat Sheet', nameAr: 'ورقة غش Git', description: 'Quick reference for common Git commands', descriptionAr: 'مرجع سريع لأوامر Git الشائعة', icon: GitBranch, category: 'engineering' },
  { id: 'linux-commands', name: 'Linux Commands', nameAr: 'أوامر Linux', description: 'Quick reference for common Linux commands', descriptionAr: 'مرجع سريع لأوامر Linux الشائعة', icon: Terminal, category: 'engineering' },
  { id: 'regex-cheatsheet', name: 'Regex Cheat Sheet', nameAr: 'ورقة غش التعبيرات النمطية', description: 'Quick reference for regular expression syntax', descriptionAr: 'مرجع سريع لصيغ التعبيرات النمطية', icon: Search, category: 'engineering' },
  { id: 'http-cheatsheet', name: 'HTTP Cheat Sheet', nameAr: 'ورقة غش HTTP', description: 'Quick reference for HTTP essentials', descriptionAr: 'مرجع سريع لأساسيات HTTP', icon: Cloud, comingSoon: true, category: 'engineering' },
  { id: 'html-entities', name: 'HTML Entities', nameAr: 'كيانات HTML', description: 'Reference for common HTML entities', descriptionAr: 'مرجع لكيانات HTML الشائعة', icon: AtSign, category: 'engineering' },
  { id: 'ascii-table', name: 'ASCII Table', nameAr: 'جدول ASCII', description: 'Complete ASCII character reference table', descriptionAr: 'جدول مرجعي كامل لأحرف ASCII', icon: Columns, category: 'engineering' },
  // Developer Utilities
  { id: 'unix-timestamp', name: 'Unix Timestamp', nameAr: 'طابع Unix الزمني', description: 'Convert Unix timestamps to human-readable dates', descriptionAr: 'تحويل طوابع Unix الزمنية إلى تواريخ مقروءة', icon: Clock, category: 'engineering' },
  { id: 'qr-generator-eng', name: 'QR Code Generator', nameAr: 'مولد رموز QR', description: 'Generate QR codes from text and URLs', descriptionAr: 'إنشاء رموز QR من النصوص والروابط', icon: QrCode, category: 'engineering' },
  { id: 'barcode-generator', name: 'Barcode Generator', nameAr: 'مولد الباركود', description: 'Generate barcodes from numeric data', descriptionAr: 'إنشاء باركود من البيانات الرقمية', icon: Barcode, comingSoon: true, category: 'engineering' },
  { id: 'lorem-ipsum', name: 'Lorem Ipsum', nameAr: 'مولّد لوريم إيبسوم', description: 'Generate placeholder Lorem Ipsum text', descriptionAr: 'توليد نص لوريم إيبسوم تجريبي', icon: Quote, category: 'engineering' },
  { id: 'random-data', name: 'Random Data', nameAr: 'مولّد بيانات عشوائية', description: 'Generate random test data of various types', descriptionAr: 'توليد بيانات اختبار عشوائية بأنواع متعددة', icon: ListChecks, category: 'engineering' },
  { id: 'cron-builder', name: 'Cron Builder', nameAr: 'منشئ Cron', description: 'Build cron expressions visually', descriptionAr: 'إنشاء تعبيرات cron بصرياً', icon: CalendarClock, comingSoon: true, category: 'engineering' },
  // Security
  { id: 'password-strength', name: 'Password Strength', nameAr: 'قوة كلمة المرور', description: 'Analyze password strength and security', descriptionAr: 'تحليل قوة وأمان كلمات المرور', icon: ShieldCheck, category: 'engineering' },
  { id: 'hash-verifier', name: 'Hash Verifier', nameAr: 'مدقق التجزئة', description: 'Verify text against a given hash', descriptionAr: 'التحقق من نص مقابل تجزئة معينة', icon: BadgeCheck, category: 'engineering' },
  { id: 'hmac-generator', name: 'HMAC Generator', nameAr: 'مولد HMAC', description: 'Generate HMAC signatures with secret keys', descriptionAr: 'توليد توقيعات HMAC بمفاتيح سرية', icon: LockKeyhole, category: 'engineering' },
  { id: 'jwt-inspector', name: 'JWT Inspector', nameAr: 'فاحص JWT', description: 'Inspect JWT token structure and payload', descriptionAr: 'فحص بنية رموز JWT ومحتواها', icon: Shield, comingSoon: true, category: 'engineering' },
  { id: 'token-decoder', name: 'Token Decoder', nameAr: 'مفكك الرموز', description: 'Decode various token formats', descriptionAr: 'فك ترميز صيغ الرموز المختلفة', icon: Key, comingSoon: true, category: 'engineering' },

  // AI
  { id: 'summarize-text', name: 'Summarize Text', nameAr: 'تلخيص نص', description: 'AI-powered text summarization', descriptionAr: 'تلخيص النصوص بالذكاء الاصطناعي', icon: ScrollText, category: 'ai' },
  { id: 'summarize-pdf', name: 'Summarize PDF', nameAr: 'تلخيص PDF', description: 'Summarize PDF documents with AI', descriptionAr: 'تلخيص مستندات PDF بالذكاء الاصطناعي', icon: FileText, category: 'ai' },
  { id: 'summarize-images', name: 'Summarize Images', nameAr: 'تلخيص الصور', description: 'Extract and summarize text from images', descriptionAr: 'استخراج وتلخيص النص من الصور', icon: FileImage, comingSoon: true, category: 'ai' },
  { id: 'summarize-youtube', name: 'Summarize YouTube', nameAr: 'تلخيص يوتيوب', description: 'Summarize YouTube video content', descriptionAr: 'تلخيص محتوى فيديوهات يوتيوب', icon: PlaySquare, comingSoon: true, category: 'ai' },
  { id: 'summarize-audio', name: 'Summarize Audio', nameAr: 'تلخيص الصوت', description: 'Transcribe and summarize audio recordings', descriptionAr: 'نسخ وتلخيص التسجيلات الصوتية', icon: Music, comingSoon: true, category: 'ai' },
  { id: 'explain-simply', name: 'Explain Simply', nameAr: 'شرح مبسط', description: 'Explain complex topics in simple terms', descriptionAr: 'شرح المواضيع المعقدة بعبارات بسيطة', icon: Lightbulb, comingSoon: true, category: 'ai' },
  { id: 'rewrite-text', name: 'Rewrite Text', nameAr: 'إعادة كتابة النص', description: 'Rewrite text in different styles and tones', descriptionAr: 'إعادة كتابة النص بأساليب ونغمات مختلفة', icon: Pen, comingSoon: true, category: 'ai' },
  { id: 'grammar-check', name: 'Grammar Check', nameAr: 'تدقيق نحوي', description: 'Check and correct grammar and spelling errors', descriptionAr: 'التحقق وتصحيح أخطاء القواعد والإملاء', icon: CheckCircle, comingSoon: true, category: 'ai' },
  { id: 'translate', name: 'Translate', nameAr: 'ترجمة', description: 'Translate text between multiple languages', descriptionAr: 'ترجمة النصوص بين لغات متعددة', icon: Globe, comingSoon: true, category: 'ai' },
  { id: 'paragraph-to-bullets', name: 'Paragraph to Bullets', nameAr: 'فقرة إلى نقاط', description: 'Convert paragraphs into bullet point summaries', descriptionAr: 'تحويل الفقرات إلى نقاط تلخيصية', icon: List, comingSoon: true, category: 'ai' },
  { id: 'bullets-to-article', name: 'Bullets to Article', nameAr: 'نقاط إلى مقال', description: 'Expand bullet points into a full article', descriptionAr: 'توسيع النقاط إلى مقال كامل', icon: Newspaper, comingSoon: true, category: 'ai' },
  { id: 'extract-key-ideas', name: 'Extract Key Ideas', nameAr: 'استخراج الأفكار الرئيسية', description: 'Identify and extract key ideas from text', descriptionAr: 'تحديد واستخراج الأفكار الرئيسية من النص', icon: Key, comingSoon: true, category: 'ai' },
  { id: 'generate-mcqs', name: 'Generate MCQs', nameAr: 'إنشاء أسئلة اختيار', description: 'Generate multiple choice questions from content', descriptionAr: 'إنشاء أسئلة اختيار من متعدد من المحتوى', icon: HelpCircle, comingSoon: true, category: 'ai' },
  { id: 'generate-tf', name: 'Generate True/False', nameAr: 'إنشاء صح/خطأ', description: 'Generate true/false questions from content', descriptionAr: 'إنشاء أسئلة صح أو خطأ من المحتوى', icon: Zap, comingSoon: true, category: 'ai' },
  { id: 'generate-flashcards', name: 'Generate Flashcards', nameAr: 'إنشاء بطاقات تعليمية', description: 'Auto-generate flashcards from your study material', descriptionAr: 'إنشاء بطاقات تعليمية تلقائياً من مواد دراستك', icon: Layers, comingSoon: true, category: 'ai' },
  { id: 'generate-quiz', name: 'Generate Quiz', nameAr: 'إنشاء اختبار', description: 'Create a complete quiz from any content', descriptionAr: 'إنشاء اختبار كامل من أي محتوى', icon: BookOpenCheck, comingSoon: true, category: 'ai' },
  { id: 'generate-study-plan', name: 'Generate Study Plan', nameAr: 'إنشاء خطة دراسة', description: 'Create a personalized study plan', descriptionAr: 'إنشاء خطة دراسة مخصصة', icon: CalendarDays, comingSoon: true, category: 'ai' },
  { id: 'generate-mindmap', name: 'Generate Mind Map', nameAr: 'إنشاء خريطة ذهنية', description: 'Create visual mind maps from text content', descriptionAr: 'إنشاء خرائط ذهنية مرئية من المحتوى النصي', icon: BrainCircuit, comingSoon: true, category: 'ai' },
  { id: 'extract-terminology', name: 'Extract Terminology', nameAr: 'استخراج المصطلحات', description: 'Extract key terms and definitions from content', descriptionAr: 'استخراج المصطلحات والتعريفات الرئيسية من المحتوى', icon: Book, comingSoon: true, category: 'ai' },
  { id: 'explain-terminology', name: 'Explain Terminology', nameAr: 'شرح المصطلحات', description: 'Get simple explanations of complex terminology', descriptionAr: 'الحصول على شروحات بسيطة للمصطلحات المعقدة', icon: Type, comingSoon: true, category: 'ai' },
  { id: 'simplify-paper', name: 'Simplify Paper', nameAr: 'تبسيط ورقة بحثية', description: 'Simplify academic papers for better understanding', descriptionAr: 'تبسيط الأوراق الأكاديمية لفهم أفضل', icon: Microscope, comingSoon: true, category: 'ai' },

  // PDF
  { id: 'word-to-pdf', name: 'Word to PDF', nameAr: 'Word إلى PDF', description: 'Convert Word documents to PDF format', descriptionAr: 'تحويل مستندات Word إلى صيغة PDF', icon: FileText, category: 'pdf' },
  { id: 'excel-to-pdf', name: 'Excel to PDF', nameAr: 'Excel إلى PDF', description: 'Convert Excel spreadsheets to PDF', descriptionAr: 'تحويل جداول Excel إلى PDF', icon: FileSpreadsheet, category: 'pdf' },
  { id: 'ppt-to-pdf', name: 'PPT to PDF', nameAr: 'PPT إلى PDF', description: 'Convert PowerPoint presentations to PDF', descriptionAr: 'تحويل عروض PowerPoint إلى PDF', icon: Presentation, category: 'pdf' },
  { id: 'merge-pdfs', name: 'Merge PDF', nameAr: 'دمج PDF', description: 'Combine multiple PDF files into a single document', descriptionAr: 'دمج ملفات PDF متعددة في مستند واحد', icon: Paperclip, category: 'pdf' },
  { id: 'split-pdf', name: 'Split PDF', nameAr: 'تقسيم PDF', description: 'Split a PDF file into separate pages or ranges', descriptionAr: 'تقسيم ملف PDF إلى صفحات أو نطاقات منفصلة', icon: Scissors, category: 'pdf' },
 { id: 'compress-pdf', name: 'Compress PDF', nameAr: 'ضغط PDF', description: 'Reduce PDF file size without losing quality', descriptionAr: 'تقليل حجم ملف PDF دون فقدان الجودة', icon: FileArchive, category: 'pdf' },

  { id: 'delete-pages', name: 'Delete Pages', nameAr: 'حذف صفحات', description: 'Remove unwanted pages from a PDF document', descriptionAr: 'إزالة الصفحات غير المرغوب فيها من مستند PDF', icon: Trash2, category: 'pdf' }, 
  { id: 'reorder-pages', name: 'Reorder Pages', nameAr: 'إعادة ترتيب الصفحات', description: 'Rearrange pages in a PDF document', descriptionAr: 'إعادة ترتيب الصفحات في مستند PDF', icon: ArrowUpDown, category: 'pdf' },
  { id: 'rotate-pages', name: 'Rotate Pages', nameAr: 'تدوير الصفحات', description: 'Rotate individual pages in a PDF', descriptionAr: 'تدوير صفحات فردية في PDF', icon: RotateCw, category: 'pdf' },
  { id: 'password-protect', name: 'Password Protect', nameAr: 'حماية بكلمة مرور', description: 'Add password protection to PDF files', descriptionAr: 'إضافة حماية بكلمة مرور لملفات PDF', icon: Lock, category: 'pdf' },
  { id: 'remove-password', name: 'Remove Password', nameAr: 'إزالة كلمة المرور', description: 'Remove password protection from PDF files', descriptionAr: 'إزالة حماية كلمة المرور من ملفات PDF', icon: Unlock, category: 'pdf' },
  // POWERPOINT
{ id: 'generate-ppt-text', name: 'Generate PPT from Text', nameAr: 'إنشاء PPT من نص', description: 'Create a presentation from text content', descriptionAr: 'إنشاء عرض تقديمي من محتوى نصي', icon: Presentation, category: 'powerpoint', comingSoon: true },
{ id: 'generate-ppt-pdf', name: 'Generate PPT from PDF', nameAr: 'إنشاء PPT من PDF', description: 'Convert PDF to a PowerPoint presentation', descriptionAr: 'تحويل PDF إلى عرض PowerPoint', icon: FileText, category: 'powerpoint', comingSoon: true },
{ id: 'merge-ppt', name: 'Merge PowerPoint', nameAr: 'دمج عروض PowerPoint', description: 'Combine multiple PowerPoint presentations into one', descriptionAr: 'دمج عدة عروض PowerPoint في عرض واحد', icon: Combine, category: 'powerpoint', comingSoon: true },
{ id: 'split-ppt', name: 'Split PowerPoint', nameAr: 'تقسيم عرض PowerPoint', description: 'Split a presentation into multiple files', descriptionAr: 'تقسيم عرض PowerPoint إلى عدة ملفات', icon: Scissors, category: 'powerpoint', comingSoon: true },
{ id: 'compress-ppt', name: 'Compress PowerPoint', nameAr: 'ضغط PowerPoint', description: 'Reduce the size of your PowerPoint presentation', descriptionAr: 'تقليل حجم عرض PowerPoint', icon: Archive, category: 'powerpoint', comingSoon: true },
{ id: 'protect-ppt', name: 'Protect PowerPoint', nameAr: 'حماية PowerPoint', description: 'Add password protection to your presentation', descriptionAr: 'إضافة كلمة مرور لحماية العرض التقديمي', icon: Lock, category: 'powerpoint', comingSoon: true },
{ id: 'unlock-ppt', name: 'Unlock PowerPoint', nameAr: 'إزالة حماية PowerPoint', description: 'Remove password protection from your presentation', descriptionAr: 'إزالة كلمة المرور من العرض التقديمي', icon: Unlock, category: 'powerpoint', comingSoon: true },
 { id: 'number-slides', name: 'Number Slides', nameAr: 'ترقيم الشرائح', description: 'Automatically add slide numbers to your presentation', descriptionAr: 'إضافة أرقام الشرائح تلقائيًا إلى العرض التقديمي', icon: Hash, category: 'powerpoint', comingSoon: true },

// VIDEO
  { id: 'extract-audio-video', name: 'Extract Audio from Video', nameAr: 'استخراج الصوت من فيديو', description: 'Extract audio track from video files', descriptionAr: 'استخراج المسار الصوتي من ملفات الفيديو', icon: Music, category: 'video' },
  { id: 'compress-video', name: 'Compress Video', nameAr: 'ضغط الفيديو', description: 'Reduce video file size while maintaining quality', descriptionAr: 'تقليل حجم ملف الفيديو مع الحفاظ على الجودة', icon: Minimize2, comingSoon: true, category: 'video' },
  { id: 'convert-video', name: 'Convert Video', nameAr: 'تحويل الفيديو', description: 'Convert videos between different formats', descriptionAr: 'تحويل الفيديوهات بين صيغ مختلفة', icon: ArrowLeftRight, comingSoon: true, category: 'video' },
  { id: 'video-to-audio', name: 'Video to Audio', nameAr: 'فيديو إلى صوت', description: 'Convert video files to audio formats', descriptionAr: 'تحويل ملفات الفيديو إلى صيغ صوتية', icon: Mic, comingSoon: true, category: 'video' },

  // IMAGES
  { id: 'bg-remove', name: 'Background Remover', nameAr: 'إزالة الخلفية', description: 'Remove background from images automatically', descriptionAr: 'إزالة الخلفية من الصور تلقائياً', icon: Scissors, comingSoon: true, category: 'images' },
  { id: 'rotate-image', name: 'Rotate Image', nameAr: 'تدوير الصورة', description: 'Rotate images to any angle', descriptionAr: 'تدوير الصور بأي زاوية', icon: RotateCw, comingSoon: true, category: 'images' },
  { id: 'blur-image', name: 'Blur Image', nameAr: 'تعتيم الصورة', description: 'Blur parts or whole images', descriptionAr: 'تعتيم أجزاء أو الصورة كاملة', icon: Droplet, comingSoon: true, category: 'images' },
  { id: 'images-to-pdf', name: 'Images to PDF', nameAr: 'صور إلى PDF', description: 'Convert multiple images into a PDF document', descriptionAr: 'تحويل صور متعددة إلى مستند PDF', icon: FileImage, comingSoon: true, category: 'images' },

  // AUDIO
  { id: 'speech-to-text', name: 'Speech to Text', nameAr: 'صوت إلى نص', description: 'Transcribe audio recordings to text', descriptionAr: 'تحويل التسجيلات الصوتية إلى نص', icon: Mic, category: 'audio' },

  // QR CODE
  { id: 'qr-generator', name: 'QR Generator', nameAr: 'مولد QR', description: 'Generate QR codes from text, URLs, or data', descriptionAr: 'إنشاء رموز QR من نص أو روابط أو بيانات', icon: QrCode, category: 'qrcode' },


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
  general: {
    name: "General",
    nameAr: "عام",
    icon: GraduationCap,
  },
  medical: {
    name: "Medical Section",
    nameAr: "القسم الطبي",
    icon: HeartPulse,
  },
  engineering: {
    name: "Engineering Section",
    nameAr: "القسم الهندسي",
    icon: Cog,
  },
  ai: {
    name: "AI Study Tools",
    nameAr: "أدوات الذكاء الاصطناعي",
    icon: Brain,
  },
  pdf: {
    name: "PDF Tools",
    nameAr: "أدوات الPDF",
    icon: FileText,
  },
  powerpoint: {
    name: "PowerPoint Tools",
    nameAr: "أدوات الPowerPoint",
    icon: Presentation,
  },
  video: {
    name: "Video Tools",
    nameAr: "أدوات الفيديو",
    icon: Video,
  },
  images: {
    name: "Images Tools",
    nameAr: "أدوات الصور",
    icon: ImageIcon,
  },
  audio: {
    name: "Audio Tools",
    nameAr: "أدوات الصوت",
    icon: Mic,
  },
  qrcode: {
    name: "QR Code",
    nameAr: "رمز QR",
    icon: QrCode,
  },

};
export const categoryOrder: ToolCategory[] = [
  'general',
  'medical',
  'engineering',
  'ai',
  'pdf',
  'powerpoint',
  'video',
  'images',
  'audio',
  'qrcode',
  
];
export function getCategoryInfo(category: ToolCategory): CategoryMeta {
  return categories[category];
}
