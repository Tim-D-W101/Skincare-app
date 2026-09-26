/** Midnight on the Monday that starts the week containing `date`, in the phone's time zone. */
export function startOfWeek(date: Date): Date {
  const daysSinceMonday = (date.getDay() + 6) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceMonday);
}

function weekKey(monday: Date): string {
  return `${monday.getFullYear()}-${monday.getMonth()}-${monday.getDate()}`;
}

function previousWeek(monday: Date): Date {
  return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7);
}

/**
 * Consecutive weeks (Monday to Sunday) with at least one scan, counting back
 * from now. The current week doesn't break a streak just because it isn't
 * over yet: with no scan so far this week, the count starts from last week.
 * Zero means the streak has lapsed, or there are no scans.
 */
export function weeklyStreak(scanDates: string[], now: Date = new Date()): number {
  const scannedWeeks = new Set(scanDates.map((iso) => weekKey(startOfWeek(new Date(iso)))));
  let week = startOfWeek(now);
  if (!scannedWeeks.has(weekKey(week))) week = previousWeek(week);

  let count = 0;
  while (scannedWeeks.has(weekKey(week))) {
    count += 1;
    week = previousWeek(week);
  }
  return count;
}
