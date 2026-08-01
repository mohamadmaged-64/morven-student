/**
 * Generic utility that groups an array of items into an object keyed by the
 * value produced by `keySelector`.
 *
 * Items keep their original order, and grouping keys are discovered purely
 * from the data (no hardcoded key lists).
 *
 * @example
 * const grouped = groupBy([1.1, 1.5, 2.1], (n) => Math.floor(n));
 * // => { 1: [1.1, 1.5], 2: [2.1] }
 */
export function groupBy<T, K extends string | number | symbol>(
  items: readonly T[],
  keySelector: (item: T, index: number) => K,
): Record<K, T[]> {
  return items.reduce<Record<K, T[]>>((acc, item, index) => {
    const key = keySelector(item, index);
    const bucket = acc[key];
    if (bucket) {
      bucket.push(item);
    } else {
      acc[key] = [item];
    }
    return acc;
  }, {} as Record<K, T[]>);
}
