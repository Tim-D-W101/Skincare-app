import type { RealtimeChannel } from '@supabase/supabase-js';

import { SCAN_POLL_INTERVAL_MS, SCAN_SAFETY_POLL_INTERVAL_MS } from '@/constants/scan';
import { logInDevelopment } from '@/lib/errors';
import { fetchScanUpdate, parseScanUpdate, type ScanUpdate } from '@/lib/scan';
import { supabase } from '@/lib/supabase';

/**
 * Follows one scan row until stopped. Realtime delivers status changes the
 * moment they happen. Polling is the safety net, so nobody is stranded on
 * the waiting screen: every 3 seconds while Realtime isn't connected, and
 * every 10 seconds while it is, in case an update goes missing.
 *
 * Updates can repeat or arrive out of order; the caller ignores stale ones.
 * Returns a function that stops watching.
 */
export function watchScan(scanId: string, onUpdate: (update: ScanUpdate) => void): () => void {
  let stopped = false;
  let realtimeConnected = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const check = async () => {
    try {
      const update = await fetchScanUpdate(scanId);
      if (!stopped) onUpdate(update);
    } catch (error: unknown) {
      // The next check tries again. The waiting screen offers a way out if
      // nothing arrives for a long time.
      logInDevelopment('Could not check the scan', error);
    }
  };

  const schedule = () => {
    if (stopped) return;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(
      () => {
        void check().finally(schedule);
      },
      realtimeConnected ? SCAN_SAFETY_POLL_INTERVAL_MS : SCAN_POLL_INTERVAL_MS,
    );
  };

  const channel: RealtimeChannel = supabase
    .channel(`scan:${scanId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'scans', filter: `id=eq.${scanId}` },
      (payload) => {
        const update = parseScanUpdate(payload.new);
        if (update && !stopped) onUpdate(update);
      },
    )
    .subscribe((status, error) => {
      if (stopped) return;
      if (status === 'SUBSCRIBED') {
        realtimeConnected = true;
        // Catch anything that changed before the subscription was live.
        void check();
        schedule();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        if (error) logInDevelopment('Realtime disconnected, polling instead', error);
        realtimeConnected = false;
        schedule();
      }
    });

  void check();
  schedule();

  return () => {
    stopped = true;
    if (timer !== null) clearTimeout(timer);
    supabase.removeChannel(channel).catch((error: unknown) => {
      logInDevelopment('Could not close the scan channel', error);
    });
  };
}
