export type CvLanguage = 'ar' | 'en';

export interface CvLabels {
  // Editor UI
  editTab: string;
  previewTab: string;
  downloadPdf: string;
  livePreview: string;
  templateLabel: string;
  designLabel: string;

  // Section headers
  personalInfo: string;
  professionalSummary: string;
  experience: string;
  education: string;
  skills: string;
  projects: string;
  certifications: string;
  languages: string;
  customSections: string;

  // Form labels
  fullName: string;
  professionalTitle: string;
  email: string;
  phone: string;
  location: string;
  photo: string;
  uploadPhoto: string;
  removePhoto: string;
  summaryPlaceholder: string;
  company: string;
  companyName: string;
  position: string;
  startDate: string;
  endDate: string;
  present: string;
  description: string;
  descriptionPlaceholder: string;
  institution: string;
  degree: string;
  field: string;
  from: string;
  to: string;
  optionalDesc: string;
  achievementsPlaceholder: string;
  skillPlaceholder: string;
  addSkill: string;
  projectName: string;
  technologies: string;
  projectUrl: string;
  projectDescPlaceholder: string;
  certName: string;
  issuer: string;
  date: string;
  certUrl: string;
  languageName: string;
  level: string;
  sectionTitle: string;
  sectionContent: string;
  interestsPlaceholder: string;
  customSectionPlaceholder: string;

  // Buttons
  add: string;

  // Empty states
  noExperience: string;
  noEducation: string;
  noProjects: string;
  noCertifications: string;
  noLanguages: string;
  noCustomSections: string;

  // Language levels
  native: string;
  fluent: string;
  advanced: string;
  intermediate: string;
  basic: string;

  // CV section titles in the preview
  cvSummary: string;
  cvExperience: string;
  cvEducation: string;
  cvSkills: string;
  cvProjects: string;
  cvCertifications: string;
  cvLanguages: string;
  cvContactInfo: string;

  // Fallback placeholders
  fallbackName: string;
  fallbackPosition: string;
  fallbackCompany: string;

  // Date formatting
  months: string[];
}

const arLabels: CvLabels = {
  editTab: 'التحرير',
  previewTab: 'المعاينة',
  downloadPdf: 'تحميل PDF',
  livePreview: 'معاينة مباشرة',
  templateLabel: 'التصميم:',
  designLabel: 'التصميم:',

  personalInfo: 'المعلومات الشخصية',
  professionalSummary: 'الملخص المهني',
  experience: 'الخبرات العملية',
  education: 'التعليم',
  skills: 'المهارات',
  projects: 'المشاريع',
  certifications: 'الشهادات',
  languages: 'اللغات',
  customSections: 'أقسام إضافية',

  fullName: 'الاسم الكامل',
  professionalTitle: 'المسمى الوظيفي',
  email: 'البريد الإلكتروني',
  phone: 'الهاتف',
  location: 'الموقع',
  photo: 'الصورة الشخصية',
  uploadPhoto: 'رفع صورة',
  removePhoto: 'إزالة الصورة',
  summaryPlaceholder: 'اكتب ملخصاً مهنياً موجزاً عن خبراتك وأهدافك...',
  company: 'الشركة',
  companyName: 'اسم الشركة',
  position: 'المسمى الوظيفي',
  startDate: 'تاريخ البداية',
  endDate: 'تاريخ النهاية',
  present: 'حتى الآن',
  description: 'الوصف',
  descriptionPlaceholder: 'اكتب عن مهامك وإنجازاتك...',
  institution: 'المؤسسة التعليمية',
  degree: 'الدرجة العلمية',
  field: 'التخصص',
  from: 'من',
  to: 'إلى',
  optionalDesc: 'الوصف (اختياري)',
  achievementsPlaceholder: 'إنجازات أو ملاحظات...',
  skillPlaceholder: 'أضف مهارة واضغط Enter',
  addSkill: 'إضافة',
  projectName: 'اسم المشروع',
  technologies: 'التقنيات',
  projectUrl: 'رابط المشروع',
  projectDescPlaceholder: 'وصف مختصر للمشروع...',
  certName: 'اسم الشهادة',
  issuer: 'الجهة المانحة',
  date: 'التاريخ',
  certUrl: 'الرابط (اختياري)',
  languageName: 'اللغة',
  level: 'المستوى',
  sectionTitle: 'عنوان القسم',
  sectionContent: 'المحتوى',
  interestsPlaceholder: 'مثال: الاهتمامات',
  customSectionPlaceholder: 'اكتب محتوى القسم هنا...',

  add: 'إضافة',

  noExperience: 'لا توجد خبرات مضافة بعد',
  noEducation: 'لا توجد تعليم مضافة بعد',
  noProjects: 'لا توجد مشاريع مضافة بعد',
  noCertifications: 'لا توجد شهادات مضافة بعد',
  noLanguages: 'لا توجد لغات مضافة بعد',
  noCustomSections: 'لا توجد أقسام إضافية',

  native: 'اللغة الأم',
  fluent: 'طلاقة',
  advanced: 'متقدم',
  intermediate: 'متوسط',
  basic: 'أساسي',

  cvSummary: 'الملخص المهني',
  cvExperience: 'الخبرات العملية',
  cvEducation: 'التعليم',
  cvSkills: 'المهارات',
  cvProjects: 'المشاريع',
  cvCertifications: 'الشهادات',
  cvLanguages: 'اللغات',
  cvContactInfo: 'معلومات الاتصال',

  fallbackName: 'الاسم الكامل',
  fallbackPosition: 'المسمى الوظيفي',
  fallbackCompany: 'اسم الشركة',

  months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

const enLabels: CvLabels = {
  editTab: 'Edit',
  previewTab: 'Preview',
  downloadPdf: 'Download PDF',
  livePreview: 'Live Preview',
  templateLabel: 'Template:',
  designLabel: 'Design:',

  personalInfo: 'Personal Information',
  professionalSummary: 'Professional Summary',
  experience: 'Work Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  languages: 'Languages',
  customSections: 'Custom Sections',

  fullName: 'Full Name',
  professionalTitle: 'Professional Title',
  email: 'Email',
  phone: 'Phone',
  location: 'Location',
  photo: 'Profile Photo',
  uploadPhoto: 'Upload Photo',
  removePhoto: 'Remove Photo',
  summaryPlaceholder: 'Write a brief professional summary about your experience and goals...',
  company: 'Company',
  companyName: 'Company Name',
  position: 'Position',
  startDate: 'Start Date',
  endDate: 'End Date',
  present: 'Present',
  description: 'Description',
  descriptionPlaceholder: 'Write about your responsibilities and achievements...',
  institution: 'Institution',
  degree: 'Degree',
  field: 'Field of Study',
  from: 'From',
  to: 'To',
  optionalDesc: 'Description (Optional)',
  achievementsPlaceholder: 'Achievements or notes...',
  skillPlaceholder: 'Add a skill and press Enter',
  addSkill: 'Add',
  projectName: 'Project Name',
  technologies: 'Technologies',
  projectUrl: 'Project URL',
  projectDescPlaceholder: 'Brief project description...',
  certName: 'Certificate Name',
  issuer: 'Issuer',
  date: 'Date',
  certUrl: 'URL (Optional)',
  languageName: 'Language',
  level: 'Level',
  sectionTitle: 'Section Title',
  sectionContent: 'Content',
  interestsPlaceholder: 'e.g., Hobbies',
  customSectionPlaceholder: 'Write section content here...',

  add: 'Add',

  noExperience: 'No experience added yet',
  noEducation: 'No education added yet',
  noProjects: 'No projects added yet',
  noCertifications: 'No certifications added yet',
  noLanguages: 'No languages added yet',
  noCustomSections: 'No custom sections',

  native: 'Native',
  fluent: 'Fluent',
  advanced: 'Advanced',
  intermediate: 'Intermediate',
  basic: 'Basic',

  cvSummary: 'Professional Summary',
  cvExperience: 'Work Experience',
  cvEducation: 'Education',
  cvSkills: 'Skills',
  cvProjects: 'Projects',
  cvCertifications: 'Certifications',
  cvLanguages: 'Languages',
  cvContactInfo: 'Contact Information',

  fallbackName: 'Full Name',
  fallbackPosition: 'Position',
  fallbackCompany: 'Company Name',

  months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

export function getCvLabels(lang: CvLanguage): CvLabels {
  return lang === 'ar' ? arLabels : enLabels;
}

export const cvLanguageOptions = [
  { id: 'ar' as CvLanguage, name: 'العربية', nameEn: 'Arabic' },
  { id: 'en' as CvLanguage, name: 'English', nameEn: 'English' },
];
