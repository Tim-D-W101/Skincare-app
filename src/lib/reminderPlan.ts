import { copy } from '@/constants/copy';
import { SUGGESTED_SCAN_INTERVAL_DAYS } from '@/constants/progress';
import {
  REMINDER_HORIZON_DAYS,
  ROUTINE_REMINDER_HOURS,
  STREAK_REMINDER_HOUR,
  STREAK_REMINDER_MIN_WEEKS,
} from '@/constants/reminders';
import { localDayKey } from '@/lib/dates';
import { startOfWeek, weeklyStreak } from '@/lib/streak';

export type RoutineReminderSlot = 'off' | 'morning' | 'evening';
export type ReminderKind = 'weekly' | 'streak' | 'routine';

export interface ReminderInputs {
  now: Date;
  /** The master switch. Off means nothing is scheduled. */
  enabled: boolean;
  weekly: {
    enabled: boolean;
    /** 0 is Sunday, as in Date.getDay(). */
    weekday: number;
    /** Local hour, 0-23. */
    hour: number;
  };
  streakEnabled: boolean;
  routine: RoutineReminderSlot;
  /** When each completed scan was taken, oldest first. */
  scanDates: string[];
  /** Local days (YYYY-MM-DD) that have already had a reminder. */
  usedDays: string[];
}

export interface PlannedReminder {
  kind: ReminderKind;
  date: Date;
  title: string;
  body: string;
}

/** Higher wins when two reminders fall on the same day. */
const PRIORITY: Record<ReminderKind, number> = { weekly: 3, streak: 2, routine: 1 };

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** The day `offset` days after `date`'s day, at `hour`:00 local time. */
function atLocal(date: Date, offset: number, hour: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset, hour);
}

/** The first moment at or after `from` that falls on `weekday` at `hour`:00. */
function nextWeekday(from: Date, weekday: number, hour: number): Date {
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = atLocal(from, offset, hour);
    if (candidate.getDay() === weekday && candidate.getTime() >= from.getTime()) return candidate;
  }
  return atLocal(from, 7, hour);
}

/** Varies the weekly message from week to week, the same way every time it's planned. */
function weeklyMessage(date: Date): { title: string; body: string } {
  const messages = copy.notifications.weeklyRescan;
  return messages[Math.floor(date.getTime() / WEEK_MS) % messages.length];
}

function weeklyCandidates(inputs: ReminderInputs): PlannedReminder[] {
  const { now, weekly, scanDates } = inputs;
  const lastScan = scanDates[scanDates.length - 1];
  if (!weekly.enabled || !lastScan) return [];
  // A week after the last scan, on the chosen day and hour; if that has
  // passed without a scan, the next time that day and hour come round.
  const due = atLocal(new Date(lastScan), SUGGESTED_SCAN_INTERVAL_DAYS, 0);
  let first = nextWeekday(due, weekly.weekday, weekly.hour);
  if (first.getTime() <= now.getTime()) {
    first = nextWeekday(new Date(now.getTime() + 1), weekly.weekday, weekly.hour);
  }
  // A second one a week later, in case the first passes unanswered.
  const second = atLocal(first, 7, weekly.hour);
  return [first, second].map((date) => ({ kind: 'weekly', date, ...weeklyMessage(date) }));
}

function streakCandidates(inputs: ReminderInputs): PlannedReminder[] {
  const { now, scanDates } = inputs;
  if (!inputs.streakEnabled) return [];
  const weeks = weeklyStreak(scanDates, now);
  const weekStart = startOfWeek(now).getTime();
  const scannedThisWeek = scanDates.some((iso) => new Date(iso).getTime() >= weekStart);
  if (weeks < STREAK_REMINDER_MIN_WEEKS || scannedThisWeek) return [];
  // The last day of the week: one day from the streak ending. Once a week at most.
  const sunday = atLocal(startOfWeek(now), 6, STREAK_REMINDER_HOUR);
  if (sunday.getTime() <= now.getTime()) return [];
  return [
    {
      kind: 'streak',
      date: sunday,
      title: copy.notifications.streakAtRisk.title,
      body: copy.notifications.streakAtRisk.body(weeks),
    },
  ];
}

function routineCandidates(inputs: ReminderInputs): PlannedReminder[] {
  const { now, routine } = inputs;
  if (routine === 'off') return [];
  const message =
    routine === 'morning' ? copy.notifications.routineMorning : copy.notifications.routineEvening;
  const planned: PlannedReminder[] = [];
  for (let offset = 0; offset < REMINDER_HORIZON_DAYS; offset += 1) {
    const date = atLocal(now, offset, ROUTINE_REMINDER_HOURS[routine]);
    if (date.getTime() > now.getTime()) planned.push({ kind: 'routine', date, ...message });
  }
  return planned;
}

/**
 * Every reminder to schedule, soonest first. Never more than one on any
 * local day, whatever is switched on: a re-scan reminder beats a
 * streak reminder, which beats the routine reminder. A day that has already
 * had a reminder gets no other.
 */
export function planReminders(inputs: ReminderInputs): PlannedReminder[] {
  if (!inputs.enabled) return [];
  const horizon = atLocal(inputs.now, REMINDER_HORIZON_DAYS, 0).getTime();
  const used = new Set(inputs.usedDays);
  const byDay = new Map<string, PlannedReminder>();

  const candidates = [
    ...weeklyCandidates(inputs),
    ...streakCandidates(inputs),
    ...routineCandidates(inputs),
  ];
  for (const candidate of candidates) {
    if (candidate.date.getTime() <= inputs.now.getTime()) continue;
    if (candidate.date.getTime() >= horizon) continue;
    const day = localDayKey(candidate.date);
    if (used.has(day)) continue;
    const current = byDay.get(day);
    if (!current || PRIORITY[candidate.kind] > PRIORITY[current.kind]) byDay.set(day, candidate);
  }
  return [...byDay.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
}
