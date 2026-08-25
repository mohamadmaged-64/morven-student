import type { CvThemeColors } from './cvThemes';
import { getThemeById, type CvThemeId } from './cvThemes';

export interface CvTemplate {
  id: string;
  name: string;
  nameAr: string;
  headerStyle: 'solid' | 'minimal' | 'centered' | 'sidebar';
  layout: 'standard' | 'sidebar' | 'rtl-two-column' | 'editorial';
}

export interface CvTemplateColors {
  primary: string;
  secondary: string;
  accent: string;
  textColor: string;
  mutedColor: string;
  bgColor: string;
  dividerColor: string;
  skillBg: string;
  skillBorder: string;
  headingColor: string;
}

export function getTemplateColors(template: CvTemplate, themeId: CvThemeId): CvTemplateColors {
  const theme: CvThemeColors = getThemeById(themeId).colors;

  return {
    primary: theme.primary,
    secondary: theme.secondary,
    accent: theme.accent,
    textColor: theme.text,
    mutedColor: theme.muted,
    bgColor: theme.bg,
    dividerColor: theme.divider,
    skillBg: theme.skillBg,
    skillBorder: theme.skillBorder,
    headingColor: theme.headingText,
  };
}

export const cvTemplates: CvTemplate[] = [
  {
    id: 'professional',
    name: 'Professional',
    nameAr: 'احترافي',
    headerStyle: 'solid',
    layout: 'standard',
  },

  {
    id: 'elegant',
    name: 'Elegant',
    nameAr: 'أنيق',
    headerStyle: 'minimal',
    layout: 'sidebar',
  },
  {
    id: 'classic',
    name: 'Classic',
    nameAr: 'كلاسيكي',
    headerStyle: 'centered',
    layout: 'rtl-two-column',
  },
  {
    id: 'executive',
    name: 'Executive',
    nameAr: 'تنفيذي',
    headerStyle: 'sidebar',
    layout: 'editorial',
  },
];

export function getTemplateById(id: string): CvTemplate {
  return cvTemplates.find(t => t.id === id) || cvTemplates[0];
}
