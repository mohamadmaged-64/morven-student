export interface CvPersonalInfo {
  fullName: string;
  professionalTitle: string;
  email: string;
  phone: string;
  location: string;
}

export interface CvEducation {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface CvExperience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface CvProject {
  id: string;
  name: string;
  description: string;
  url: string;
  technologies: string;
}

export interface CvCertification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url: string;
}

export interface CvLanguage {
  id: string;
  name: string;
  level: string;
}

export interface CvCustomSection {
  id: string;
  title: string;
  content: string;
}

export interface CvData {
  personalInfo: CvPersonalInfo;
  photo: string;
  summary: string;
  education: CvEducation[];
  experience: CvExperience[];
  skills: string[];
  projects: CvProject[];
  certifications: CvCertification[];
  languages: CvLanguage[];
  customSections: CvCustomSection[];
}

export const emptyCvData: CvData = {
  personalInfo: {
    fullName: '',
    professionalTitle: '',
    email: '',
    phone: '',
    location: '',
  },
  photo: '',
  summary: '',
  education: [],
  experience: [],
  skills: [],
  projects: [],
  certifications: [],
  languages: [],
  customSections: [],
};

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}
