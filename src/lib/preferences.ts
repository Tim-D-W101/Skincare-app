import * as SecureStore from 'expo-secure-store';

/**
 * Small on-device flags. They live in SecureStore only because it is the one
 * persistent key-value store the app already has; none of them is secret.
 */

const GHOST_TOOLTIP_KEY = 'glowtrack.ghost-tooltip-seen';

export async function hasSeenGhostTooltip(): Promise<boolean> {
  return (await SecureStore.getItemAsync(GHOST_TOOLTIP_KEY)) === 'true';
}

export async function markGhostTooltipSeen(): Promise<void> {
  await SecureStore.setItemAsync(GHOST_TOOLTIP_KEY, 'true');
}
