/**
 * App-wide display locale for Intl date/number formatting.
 *
 * Arabic language (month names, weekday names, Hijri era) with the Latin
 * numbering system forced via the `nu-latn` Unicode extension, so every
 * formatted number renders as Western digits (0123456789) instead of
 * Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩), regardless of the user's OS locale.
 *
 * Use this constant for any formatting call that previously relied on the
 * browser's default locale; extend existing `ar-*` locale tags in place
 * with `-u-nu-latn` when their options must stay site-specific.
 */
export const APP_DISPLAY_LOCALE = 'ar-EG-u-nu-latn';
