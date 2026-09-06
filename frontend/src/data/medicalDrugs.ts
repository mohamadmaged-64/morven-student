import { DRUGS_PART1 } from './medical/drugsPart1';
import { DRUGS_PART2 } from './medical/drugsPart2';
import { DRUGS_PART3 } from './medical/drugsPart3';
import { DRUGS_PART4 } from './medical/drugsPart4';
import { DRUGS_PART5 } from './medical/drugsPart5';
import { DRUGS_PART6 } from './medical/drugsPart6';
import { DRUGS_PART7 } from './medical/drugsPart7';
import { DRUGS_PART8 } from './medical/drugsPart8';
import { DRUGS_PART9 } from './medical/drugsPart9';

export const DRUGS = {
  ...DRUGS_PART1,
  ...DRUGS_PART2,
  ...DRUGS_PART3,
  ...DRUGS_PART4,
  ...DRUGS_PART5,
  ...DRUGS_PART6,
  ...DRUGS_PART7,
  ...DRUGS_PART8,
  ...DRUGS_PART9,
} as const;

export const DRUG_COUNT = Object.keys(DRUGS).length;