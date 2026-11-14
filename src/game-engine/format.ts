const UNITS = [
  { size: 1_000_000_000_000, suffix: 'T' },
  { size: 1_000_000_000, suffix: 'B' },
  { size: 1_000_000, suffix: 'M' },
  { size: 1_000, suffix: 'K' },
] as const;

/**
 * A number as shown on screen: whole below 1000, then K, M, B and T to three
 * digits, cut rather than rounded, with trailing zeros dropped
 * (1345 → "1.34K", 18987 → "18.9K", 123456 → "123K", 1250000 → "1.25M", 2000 → "2K").
 */
export function formatCompact(value: number): string {
  const n = Math.round(value);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  for (const { size, suffix } of UNITS) {
    if (abs < size) continue;
    // Digits kept after the point: 2 below 10 of the unit, 1 below 100, then none.
    const places = abs >= size * 100 ? 1 : abs >= size * 10 ? 10 : 100;
    return `${sign}${Math.trunc(abs / (size / places)) / places}${suffix}`;
  }
  return String(n);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** A `YYYY-MM-DD` day key as a short date ("Nov 20", or "Fri, Nov 20"), read off the key itself so no time zone can slip it a day. */
export function formatDayKey(dayKey: string, withWeekday = false): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  const date = `${MONTHS[month - 1]} ${day}`;
  return withWeekday ? `${WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]}, ${date}` : date;
}
