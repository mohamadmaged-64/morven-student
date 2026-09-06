import { describe, expect, it } from 'vitest';
import { DISEASES } from '@/data/medicalDiseases';
import { DRUGS } from '@/data/medicalDrugs';
import type { DiseaseCategory } from '@/data/medicalTypes';

const VALID_CATEGORIES: DiseaseCategory[] = [
  'cardiovascular',
  'respiratory',
  'neurology',
  'gastroenterology',
  'nephrology',
  'endocrine',
  'hematology',
  'infectious',
  'rheumatology',
  'dermatology',
  'ophthalmology',
  'ent',
  'musculoskeletal',
  'metabolic',
  'psychiatry',
  'oncology',
  'urology',
  'obgyn',
  'emergency',
];

describe('Medical dataset', () => {
  describe('Drugs', () => {
    it('contains at least 250 unique drugs', () => {
      expect(Object.keys(DRUGS).length).toBeGreaterThanOrEqual(250);
    });

    it('has unique record keys', () => {
      const keys = Object.keys(DRUGS);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it('has unique drug names', () => {
      const names = Object.values(DRUGS).map((d) => d.name);
      expect(new Set(names).size).toBe(names.length);
    });

    it('has all required fields filled', () => {
      for (const [key, drug] of Object.entries(DRUGS)) {
        expect(drug.name, key).toBeTruthy();
        expect(drug.drugClass, key).toBeTruthy();
        expect(drug.indications.length, `${key} indications`).toBeGreaterThan(0);
        expect(drug.sideEffects.length, `${key} sideEffects`).toBeGreaterThan(0);
        expect(drug.contraindications.length, `${key} contraindications`).toBeGreaterThan(0);
      }
    });
  });

  describe('Diseases', () => {
    it('contains at least 250 unique diseases', () => {
      expect(Object.keys(DISEASES).length).toBeGreaterThanOrEqual(250);
    });

    it('has unique record keys', () => {
      const keys = Object.keys(DISEASES);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it('has unique disease names', () => {
      const names = Object.values(DISEASES).map((d) => d.name);
      expect(new Set(names).size).toBe(names.length);
    });

    it('assigns valid categories only', () => {
      for (const [key, disease] of Object.entries(DISEASES)) {
        expect(VALID_CATEGORIES, `${key} (${disease.category})`).toContain(disease.category);
      }
    });

    it('spans all 19 categories', () => {
      const used = new Set(Object.values(DISEASES).map((d) => d.category));
      for (const cat of VALID_CATEGORIES) {
        expect(used.has(cat), cat).toBe(true);
      }
    });

    it('has all required fields filled', () => {
      for (const [key, disease] of Object.entries(DISEASES)) {
        expect(disease.name, key).toBeTruthy();
        expect(disease.symptoms.length, `${key} symptoms`).toBeGreaterThan(0);
        expect(disease.causes.length, `${key} causes`).toBeGreaterThan(0);
        expect(disease.treatment.length, `${key} treatment`).toBeGreaterThan(0);
        expect(disease.description, key).toBeTruthy();
      }
    });
  });
});