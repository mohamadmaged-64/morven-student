/**
 * Public surface of the Prayer Pause feature.
 * Everything outside this folder should import from here only.
 */

export { PrayerPauseHost } from './PrayerPauseHost';
export { OVERLAY_Z_INDEX } from './config';
export { usePrayerPause, type UsePrayerPauseResult } from './usePrayerPause';
export {
  usePrayerPauseStore,
  getPrayerPauseStatus,
  type PrayerPauseStatus,
  type EnterActivePayload,
} from './prayerPauseStore';
export {
  evaluate,
  startPrayerScheduler,
  stopPrayerScheduler,
  getSchedulerDebugState,
} from './prayerScheduler';
