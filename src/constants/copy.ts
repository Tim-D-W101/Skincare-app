/**
 * Every user-facing string in the app lives here and nowhere else.
 *
 * Before adding or editing a string, read the compliance rules in CLAUDE.md
 * section 3: this is a cosmetic beauty app, and the vocabulary list there is
 * binding. Reviewing this one file proves the whole app's wording.
 *
 * This is the starting set needed by the UI primitives. The full, grouped
 * copy for each area of the app is added in P2.3.
 */
export const copy = {
  common: {
    retry: 'Try again',
    loading: 'Loading',
  },
  errors: {
    generic: "Something didn't load. Check your connection and try again.",
  },
  disclaimers: {
    short: 'A cosmetic estimate from a photo, not professional skincare advice.',
    full:
      'GlowTrack gives cosmetic estimates of how your skin looks in a photo. Lighting and ' +
      "camera quality affect the results. It isn't a substitute for advice from a qualified " +
      'professional, so if anything about your skin worries you, please see one.',
  },
  devGallery: {
    open: 'Open component gallery',
    title: 'Component gallery',
    intro:
      'Development only. Switch your phone between light and dark mode to check both palettes.',
    sections: {
      text: 'Text',
      buttons: 'Buttons',
      cards: 'Cards',
      scoreRings: 'Score rings',
      chips: 'Chips',
      emptyState: 'Empty state',
      loadingState: 'Loading state',
      errorState: 'Error state',
      disclaimer: 'Disclaimer',
    },
    textSample: 'Your routine, week by week.',
    buttons: {
      primary: 'Primary',
      secondary: 'Secondary',
      ghost: 'Ghost',
      destructive: 'Destructive',
      withIcon: 'With icon',
      loading: 'Loading',
      disabled: 'Disabled',
      fullWidth: 'Full width',
    },
    cardBody: 'A card groups related content on the surface colour.',
    replay: 'Replay animation',
    ringLabels: ['Clarity', 'Texture', 'Evenness', 'Glow', 'Overall'],
    chipOptions: ['Visible pores', 'Dryness', 'Dullness', 'Uneven tone', 'Redness'],
    chipCounter: (selected: number, max: number) => `${selected} of ${max} selected`,
    emptyTitle: 'No scans yet',
    emptyBody: 'Your first scan sets the baseline everything else is compared with.',
    emptyAction: 'Take a scan',
  },
} as const;
