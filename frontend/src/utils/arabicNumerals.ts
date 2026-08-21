const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** Formats a user-facing numeric string without changing its underlying value. */
export function formatArabicIndicNumerals(value: string | number): string {
  return String(value)
    .replace(/(\d)\.(\d)/g, '$1٫$2')
    .replace(/(\d),(\d)/g, '$1٬$2')
    .replace(/(\d)\s*%/g, '$1٪')
    .replace(/\d/g, (digit) => ARABIC_INDIC_DIGITS[Number(digit)]);
}
