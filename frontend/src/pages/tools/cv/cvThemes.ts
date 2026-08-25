export type CvThemeId = 'emerald' | 'royal-blue' | 'deep-purple' | 'burgundy' | 'slate' | 'amber';

export interface CvThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  muted: string;
  bg: string;
  headingText: string;
  divider: string;
  skillBg: string;
  skillBorder: string;
  sidebarBg: string;
  whiteText: string;
}

export interface CvTheme {
  id: CvThemeId;
  name: string;
  nameAr: string;
  swatch: string;
  colors: CvThemeColors;
}

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amount);
  const b = Math.max(0, (num & 0x0000ff) - amount);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0x00ff) + amount);
  const b = Math.min(255, (num & 0x0000ff) + amount);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = num >> 16;
  const g = (num >> 8) & 0x00ff;
  const b = num & 0x0000ff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildThemeColors(primary: string): CvThemeColors {
  return {
    primary,
    secondary: darken(primary, 30),
    accent: lighten(primary, 40),
    text: '#1f2937',
    muted: '#6b7280',
    bg: '#ffffff',
    headingText: '#111827',
    divider: primary,
    skillBg: hexToRgba(primary, 0.08),
    skillBorder: hexToRgba(primary, 0.2),
    sidebarBg: primary,
    whiteText: '#ffffff',
  };
}

export const cvThemes: CvTheme[] = [
  {
    id: 'emerald',
    name: 'Emerald',
    nameAr: 'أخضر داكن',
    swatch: '#0F766E',
    colors: buildThemeColors('#0F766E'),
  },
  {
    id: 'royal-blue',
    name: 'Royal Blue',
    nameAr: 'أزرق ',
    swatch: '#2563EB',
    colors: buildThemeColors('#2563EB'),
  },
  {
    id: 'deep-purple',
    name: 'Deep Purple',
    nameAr: 'بنفسجي غامق',
    swatch: '#6D28D9',
    colors: buildThemeColors('#6D28D9'),
  },
  {
    id: 'burgundy',
    name: 'Burgundy',
    nameAr: 'أحمر داكن',
    swatch: '#9F1239',
    colors: buildThemeColors('#9F1239'),
  },
  {
    id: 'slate',
    name: 'Slate',
    nameAr: 'أسود لامع',
    swatch: '#334155',
    colors: buildThemeColors('#334155'),
  },
  {
    id: 'amber',
    name: 'Amber',
    nameAr: 'برتقالي',
    swatch: '#D97706',
    colors: buildThemeColors('#D97706'),
  },
];

export function getThemeById(id: CvThemeId): CvTheme {
  return cvThemes.find(t => t.id === id) || cvThemes[0];
}
