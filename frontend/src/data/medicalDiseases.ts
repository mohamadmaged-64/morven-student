import { DISEASES_PART1 } from './medical/diseasesPart1';
import { DISEASES_PART2 } from './medical/diseasesPart2';
import { DISEASES_PART3 } from './medical/diseasesPart3';
import { DISEASES_PART4 } from './medical/diseasesPart4';
import { DISEASES_PART5 } from './medical/diseasesPart5';
import { DISEASES_PART6 } from './medical/diseasesPart6';
import { DISEASES_PART7 } from './medical/diseasesPart7';
import { DISEASES_PART8 } from './medical/diseasesPart8';
import { DISEASES_PART9 } from './medical/diseasesPart9';
import { DISEASES_PART10 } from './medical/diseasesPart10';
import { DISEASES_PART11 } from './medical/diseasesPart11';
import { DISEASES_PART12 } from './medical/diseasesPart12';
import { DISEASES_PART13 } from './medical/diseasesPart13';
import { DISEASES_PART14 } from './medical/diseasesPart14';
import { DISEASES_PART15 } from './medical/diseasesPart15';

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