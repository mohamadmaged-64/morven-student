import type { ToolCategory } from '@/types';

import { 
  FileText, 
  Presentation, 
  Video, 
  Music, 
  Image as ImageIcon,
  QrCode, 
  GraduationCap, 
  HeartPulse,
  Cog,
  type LucideIcon, 
} from 'lucide-react';

export interface CategoryMeta {
  name: string;
  icon: LucideIcon;
  description: string;
  comingSoon?: boolean;
}


export const categories: Record<ToolCategory, CategoryMeta> = {
   general: {
    name: 'عام',
    icon: GraduationCap,
    description: 'مدير المهام ومنشئ الملاحظات ومؤقت البومودورو والمزيد',
  },
  medical: {
    name: 'القسم الطبي',
    icon: HeartPulse,
    description: 'ملخصات طبية وبطاقات تعليمية ومراجع الأدوية وقيم المختبر',
  },
  engineering: {
    name: 'القسم الهندسي',
    icon: Cog,
    comingSoon: true,
    description: 'حاسبات هندسية ورسومات وأدوات تصميم',
  },

  pdf: {
    name: 'أدوات الPDF',
    icon: FileText,
    description: 'تحويل ودمج وتقسيم وضغط وتحرير مستندات PDF',
  },
  powerpoint: {
    name: 'أدوات الPowerPoint',
    icon: Presentation,
    description: 'إنشاء وتحرير وتحويل وتحسين عروض PowerPoint التقديمية',
  },
  video: {
    name: 'أدوات الفيديو',
    icon: Video,
    description: 'ضغط وتحويل واستخراج الصوت وتحرير الفيديوهات',
  },
   images: {
    name: 'أدوات الصور',
    icon: ImageIcon,
    description: 'إزالة الخلفيات وتدوير وتغيير الحجم وتحويل الصور',
  },
  audio: {
    name: 'أدوات الصوت',
    icon: Music,
    description: 'تحويل صيغ الصوت ونسخ الصوت إلى نص',
  },
  qrcode: {
    name: 'رمز QR',
    icon: QrCode,
    description: 'إنشاء رموز QR للروابط والنصوص والمزيد',
  },
 
};
