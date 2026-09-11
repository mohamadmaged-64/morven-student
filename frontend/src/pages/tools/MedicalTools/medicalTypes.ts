export interface DiseaseInfo {
  category: DiseaseCategory;
  name: string;
  symptoms: string[];
  causes: string[];
  treatment: string[];
  description: string;
}

export type DiseaseCategory =
  | 'cardiovascular'
  | 'respiratory'
  | 'neurology'
  | 'gastroenterology'
  | 'nephrology'
  | 'endocrine'
  | 'hematology'
  | 'infectious'
  | 'rheumatology'
  | 'dermatology'
  | 'ophthalmology'
  | 'ent'
  | 'musculoskeletal'
  | 'metabolic'
  | 'psychiatry'
  | 'oncology'
  | 'urology'
  | 'obgyn'
  | 'emergency';

export interface DrugInfo {
  name: string;
  drugClass: string;
  indications: string[];
  sideEffects: string[];
  contraindications: string[];
}
