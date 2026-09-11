/**
 * Arabic display names for the five prayers.
 * UI-layer concern only — deliberately kept out of the calculation engine.
 */

import type { PrayerId } from './prayerTimes';

export const PRAYER_ARABIC_NAMES: Record<PrayerId, string> = {
  fajr: 'الفجر',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};
