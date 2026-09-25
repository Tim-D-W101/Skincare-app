const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Whole calendar days from `from` to `to` in the phone's time zone, so a scan
 * last night and one this morning are a day apart. Never negative.
 */
export function calendarDaysBetween(from: string, to: string): number {
  const days = (startOfLocalDay(new Date(to)) - startOfLocalDay(new Date(from))) / MS_PER_DAY;
  // Rounding absorbs the hour a daylight-saving change adds or removes.
  return Math.max(0, Math.round(days));
}

/** A date the way the phone's language writes it, such as "25 Sept 2026". */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
