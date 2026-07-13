import type { ToolCategory } from '@/types';
import { 
  FileText, 
  Brain, 
  Presentation, 
  Video, 
  Music, 
  Image as ImageIcon,
  QrCode, 
  GraduationCap, 
  HeartPulse,
  type LucideIcon 
} from 'lucide-react';

export interface CategoryMeta {
  name: string;
  nameAr: string;
  icon: LucideIcon;
  description: string;
  descriptionAr: string;
}

export const categories: Record<ToolCategory, CategoryMeta> = {
  office: {
    name: 'Office & PDF',
    nameAr: 'المكتب و PDF',
    icon: FileText,
    description: 'Convert, merge, split, compress, and edit PDF documents',
    descriptionAr: 'تحويل ودمج وتقسيم وضغط وتحرير مستندات PDF',
  },
  ai: {
    name: 'AI Study Tools',
    nameAr: 'أدوات الذكاء الاصطناعي',
    icon: Brain,
    description: 'Summarize, explain, generate quizzes and study aids with AI',
    descriptionAr: 'تلخيص وشرح وإنشاء اختبارات ووسائل تعليمية بالذكاء الاصطناعي',
  },
  powerpoint: {
    name: 'PowerPoint',
    nameAr: 'باوربوينت',
    icon: Presentation,
    description: 'Create, edit, convert, and enhance PowerPoint presentations',
    descriptionAr: 'إنشاء وتحرير وتحويل وتحسين عروض PowerPoint التقديمية',
  },
  video: {
    name: 'Video Tools',
    nameAr: 'أدوات الفيديو',
    icon: Video,
    description: 'Compress, convert, extract audio, and edit videos',
    descriptionAr: 'ضغط وتحويل واستخراج الصوت وتحرير الفيديوهات',
  },
  audio: {
    name: 'Audio',
    nameAr: 'الصوت',
    icon: Music,
    description: 'Convert audio formats and transcribe speech to text',
    descriptionAr: 'تحويل صيغ الصوت ونسخ الكلام إلى نص',
  },
  images: {
    name: 'Images',
    nameAr: 'الصور',
    icon: ImageIcon,
    description: 'Remove backgrounds, rotate, blur, and convert images',
    descriptionAr: 'إزالة الخلفيات وتدوير وتغيير الحجم وتحويل الصور',
  },
  qrcode: {
    name: 'QR Code',
    nameAr: 'رمز QR',
    icon: QrCode,
    description: 'Generate QR codes for URLs, text, and more',
    descriptionAr: 'إنشاء رموز QR للروابط والنصوص والمزيد',
  },
  student: {
    name: 'Student Tools',
    nameAr: 'أدوات الطالب',
    icon: GraduationCap,
    description: 'Pomodoro timer, task manager, exam countdown, and more',
    descriptionAr: 'مؤقت بومودورو ومدير المهام وعد تنازلي للامتحانات والمزيد',
  },
  medical: {
    name: 'Medical Student',
    nameAr: 'الطالب الطبي',
    icon: HeartPulse,
    description: 'Medical summarizers, flashcards, drug references, and lab values',
    descriptionAr: 'ملخصات طبية وبطاقات تعليمية ومراجع الأدوية وقيم المختبر',
  },
};
