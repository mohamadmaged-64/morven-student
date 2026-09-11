import { DISEASES_PART1 } from './diseasesPart1';
import { DISEASES_PART2 } from './diseasesPart2';
import { DISEASES_PART3 } from './diseasesPart3';
import { DISEASES_PART4 } from './diseasesPart4';
import { DISEASES_PART5 } from './diseasesPart5';
import { DISEASES_PART6 } from './diseasesPart6';
import { DISEASES_PART7 } from './diseasesPart7';
import { DISEASES_PART8 } from './diseasesPart8';
import { DISEASES_PART9 } from './diseasesPart9';
import { DISEASES_PART10 } from './diseasesPart10';
import { DISEASES_PART11 } from './diseasesPart11';
import { DISEASES_PART12 } from './diseasesPart12';
import { DISEASES_PART13 } from './diseasesPart13';
import { DISEASES_PART14 } from './diseasesPart14';
import { DISEASES_PART15 } from './diseasesPart15';

export const DISEASES = {
  ...DISEASES_PART1,
  ...DISEASES_PART2,
  ...DISEASES_PART3,
  ...DISEASES_PART4,
  ...DISEASES_PART5,
  ...DISEASES_PART6,
  ...DISEASES_PART7,
  ...DISEASES_PART8,
  ...DISEASES_PART9,
  ...DISEASES_PART10,
  ...DISEASES_PART11,
  ...DISEASES_PART12,
  ...DISEASES_PART13,
  ...DISEASES_PART14,
  ...DISEASES_PART15,
} as const;

export const DISEASE_COUNT = Object.keys(DISEASES).length;