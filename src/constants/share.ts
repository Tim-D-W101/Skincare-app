/** The exported share image sizes, in pixels. Story is the default. */
export const SHARE_FORMATS = {
  story: { width: 1080, height: 1920 },
  feed: { width: 1080, height: 1350 },
} as const;

export type ShareFormat = keyof typeof SHARE_FORMATS;

export const DEFAULT_SHARE_FORMAT: ShareFormat = 'story';

/** How many attribute scores the card shows: the highest ones. */
export const SHARE_CARD_ATTRIBUTES = 3;
