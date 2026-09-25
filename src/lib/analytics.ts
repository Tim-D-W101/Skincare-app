import type { ShareFormat } from '@/constants/share';

/**
 * Every analytics event and its properties. A typo in an event name is a
 * compile error, not a silently missing event.
 *
 * Properties are scores, counts and choices only: never the photo, a storage
 * path, a signed URL, an email address or any text from a scan.
 */
export interface AnalyticsEvents {
  share_initiated: { surface: 'results'; format: ShareFormat };
}

export type EventName = keyof AnalyticsEvents;

/**
 * Records an event. A stand-in until PostHog is added in Phase 11: for now it
 * only logs in development, and nothing leaves the phone.
 */
export function track<E extends EventName>(event: E, properties: AnalyticsEvents[E]): void {
  if (__DEV__) {
    console.info(`[analytics] ${event}`, properties);
  }
}
