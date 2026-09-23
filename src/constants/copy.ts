/**
 * Every user-facing string in the app lives here and nowhere else.
 *
 * COMPLIANCE — READ BEFORE EDITING
 * This is a cosmetic beauty app. Store approval depends on every string here
 * staying purely cosmetic in its wording. The banned-word list and the approved vocabulary are
 * in CLAUDE.md section 3; they are not repeated here because that rule also
 * covers code comments. Check every new or edited string against that list.
 *
 * Also never, anywhere in this file:
 * - claim accuracy, precision or proof, or compare the app to a professional
 * - promise a result ("will clear", "guaranteed")
 * - describe what a scan saw when it suggests professional attention
 *
 * Tone: warm, plain, specific. Second person, short sentences, gender-neutral.
 * Written for an intelligent adult who is a little sceptical of AI claims.
 * Never hyped, never alarming.
 *
 * Reviewing this one file proves the whole app's wording.
 */

export const copy = {
  common: {
    retry: 'Try again',
    loading: 'Loading',
    continue: 'Continue',
    back: 'Back',
    close: 'Close',
    cancel: 'Cancel',
    done: 'Done',
    notNow: 'Not now',
    save: 'Save',
    learnMore: 'Learn more',
    stepOf: (step: number, total: number) => `Step ${step} of ${total}`,
  },

  onboarding: {
    welcome: {
      title: 'See whether your routine is working',
      body: 'Take a photo each week and watch how your skin looks change over time.',
      note: 'GlowTrack gives cosmetic estimates, not professional skincare advice.',
      start: 'Get started',
    },
    ageBand: {
      title: 'How old are you?',
      body: 'Skin looks different at different ages, so this helps set your baseline.',
      options: {
        '18_24': '18–24',
        '25_34': '25–34',
        '35_44': '35–44',
        '45_54': '45–54',
        '55_plus': '55+',
      },
    },
    skinType: {
      title: 'How would you describe your skin?',
      body: 'Go with your best guess. You can change it later.',
      options: {
        oily: {
          label: 'Oily',
          description: 'Looks shiny by midday, especially on the forehead and nose.',
        },
        dry: { label: 'Dry', description: 'Often feels tight, or looks flaky in places.' },
        combination: {
          label: 'Combination',
          description: 'Shiny in the middle of your face, drier on the cheeks.',
        },
        normal: { label: 'Normal', description: 'Rarely feels tight or looks shiny.' },
        sensitive: { label: 'Sensitive', description: 'Reacts easily to new products or weather.' },
        unsure: {
          label: "I'm not sure",
          description:
            "That's completely fine. Most people aren't, and your scans will tell us more.",
        },
      },
    },
    concerns: {
      title: 'What would you like to focus on?',
      body: 'Pick up to three.',
      counter: (selected: number, max: number) => `${selected} of ${max} selected`,
      limitReached: (max: number) => `You can pick up to ${max}.`,
      options: {
        blemishes: 'Visible blemishes',
        unevenTone: 'Uneven tone',
        pores: 'Visible pores',
        dryness: 'Dryness',
        dullness: 'Dullness',
        fineLines: 'Fine lines',
        redness: 'Redness',
        oiliness: 'Oiliness',
      },
    },
    goal: {
      title: "What's your main goal?",
      body: 'This shapes what your progress view highlights first.',
      options: {
        clearer: 'Clearer-looking skin',
        smoother: 'Smoother texture',
        evenTone: 'A more even tone',
        glow: 'More glow',
        hydrated: 'Skin that looks more hydrated',
        consistency: 'A routine I actually stick to',
      },
    },
    ready: {
      title: "You're all set",
      summary: (skinType: string, goal: string) =>
        `Your skin is ${skinType.toLowerCase()} and you're focusing on ${goal.toLowerCase()}. Your first scan sets the baseline.`,
      summaryUnsure: (goal: string) =>
        `You're focusing on ${goal.toLowerCase()}. Your first scan sets the baseline, and helps work out your skin type too.`,
      cta: 'Take my first scan',
    },
    saveError: "We couldn't save that answer. Check your connection and try again.",
  },

  auth: {
    starting: 'Getting things ready',
    startFailed: "We couldn't get started. Check your connection and try again.",
    signIn: {
      title: 'Sign in',
      body: "Enter your email and we'll send you a sign-in link. No password needed.",
      emailLabel: 'Email address',
      emailPlaceholder: 'you@example.com',
      submit: 'Send sign-in link',
      invalidEmail: "That doesn't look like an email address.",
    },
    checkEmail: {
      title: 'Check your email',
      body: (email: string) =>
        `We sent a sign-in link to ${email}. Open it on this phone to continue.`,
      resend: 'Send it again',
      resent: 'Sent. It can take a minute to arrive.',
      differentEmail: 'Use a different email',
    },
    saveProgress: {
      title: 'Save your progress',
      body: 'Add your email so your scans and history stay with you if you change phones.',
      cta: 'Save my progress',
      saved: 'Your progress is saved to your email.',
    },
    signOut: 'Sign out',
  },

  scan: {
    dataNotice: {
      title: 'Before your first photo',
      points: [
        'Your photo is uploaded and analysed to estimate how your skin looks.',
        'It is stored privately so you can compare scans later.',
        'It is never shared, never sold and never used for advertising.',
        'You can delete it at any time in Settings.',
      ],
      continue: 'Continue',
      notNow: 'Not now',
    },
    permission: {
      title: 'Camera access',
      body: 'GlowTrack needs your camera to take your scan photo. Photos are never saved to your gallery.',
      allow: 'Allow camera',
      deniedTitle: 'Camera access is off',
      deniedBody: 'To take a scan, turn on camera access for GlowTrack in your phone settings.',
      openSettings: 'Open settings',
    },
    guidance: {
      tooDark: 'Move to brighter light',
      tooBright: 'Move out of direct light',
      holdSteady: 'Hold steady',
      moveCloser: 'Move a little closer',
      moveBack: 'Move back a little',
      center: 'Center your face',
      good: 'Looking good',
    },
    capture: {
      shutter: 'Take photo',
      flipCamera: 'Switch camera',
      ghostOn: 'Show last photo',
      ghostOff: 'Hide last photo',
      ghostTooltip:
        'Line your face up with your last photo. Matching the position makes your before and after far easier to compare.',
      why: 'Why?',
    },
    tips: {
      title: 'Getting comparable photos',
      body: 'Small changes in light and angle change how skin looks. The more alike your photos, the more your progress reflects your skin.',
      points: [
        'Same room, same time of day',
        'No makeup',
        'Hair pulled back',
        'Neutral expression, looking straight ahead',
      ],
    },
    confirm: {
      title: 'Use this photo?',
      use: 'Use this',
      retake: 'Retake',
    },
    analysing: {
      title: 'Looking at your photo',
      statuses: {
        uploading: 'Uploading your photo',
        queued: 'Getting ready',
        processing: 'Looking at texture, tone and clarity',
      },
      stillWorking: 'Still working. This sometimes takes a little longer.',
      slow: 'This is taking longer than usual. You can keep waiting, or try again.',
      keepWaiting: 'Keep waiting',
      goBack: 'Go back',
    },
    rejected: {
      title: "We couldn't use that photo",
      retake: 'Retake photo',
      freeScanKept: "This didn't use up your free scan.",
      reasons: {
        no_face: "We couldn't find a face in the photo.",
        multiple_faces: 'There was more than one face in the photo.',
        too_dark: 'The photo was too dark. Try facing a window or a brighter light.',
        too_bright: 'The photo was too bright. Try moving out of direct light.',
        too_blurry: 'The photo was blurry. Hold the phone steady and try again.',
        face_too_small: 'Your face was too far away. Move a little closer.',
        heavy_makeup: 'Makeup makes it hard to see your skin. Try again with a bare face.',
        obstructed: 'Part of your face was covered. Pull hair back and remove glasses.',
        not_a_photo: "That doesn't look like a camera photo of a face.",
      },
    },
    failed: {
      title: 'Something went wrong',
      body: "Your scan didn't finish. This didn't use up your free scan.",
    },
  },

  results: {
    title: 'Your results',
    overall: 'Overall',
    attributes: {
      clarity: 'Clarity',
      texture: 'Texture',
      pores: 'Pores',
      hydration: 'Hydration',
      redness: 'Redness',
      evenness: 'Evenness',
      firmness: 'Firmness',
    },
    observationsTitle: 'What stands out',
    focusTitle: 'Where to focus',
    changeTitle: 'Since your last scan',
    daysSince: (days: number) => (days === 1 ? '1 day ago' : `${days} days ago`),
    change: {
      up: (points: number) => `Up ${points}`,
      down: (points: number) => `Down ${points}`,
      same: 'No change',
    },
    lowScoreNote: 'Room to improve. That is exactly what your routine is for.',
    tapToSkip: 'Tap to skip',
    buildRoutine: 'Build my routine',
    seeProgress: 'See my progress',
    share: 'Share',
  },

  share: {
    title: 'Share your progress',
    formatStory: 'Story',
    formatFeed: 'Feed',
    includePhoto: 'Include my photo',
    includePhotoHint: 'Off by default. Your photo is only added if you turn this on.',
    includePhotoConfirm: {
      title: 'Share your photo?',
      body: 'Your face will be visible to anyone you share this with.',
      confirm: 'Include photo',
    },
    cardDate: (date: string) => date,
    cardBeforeAfter: (days: number) => `${days} days apart`,
    failed: "We couldn't create the image. Try again.",
  },

  progress: {
    title: 'Progress',
    journey: (points: number, weeks: number) =>
      points >= 0
        ? `Up ${points} points in ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`
        : `Down ${Math.abs(points)} points in ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`,
    oneScan: {
      title: 'Your baseline is set',
      body: 'Your second scan is where this gets interesting. That is when you start to see change.',
      nextScan: (date: string) => `Suggested next scan: ${date}`,
    },
    noScans: {
      title: 'No scans yet',
      body: 'Your first scan sets the baseline everything else is compared with.',
      cta: 'Take a scan',
    },
    chart: {
      title: 'Over time',
      noiseBand: 'Small shifts inside the shaded band are normal photo-to-photo variation.',
      filterOverall: 'Overall',
    },
    history: {
      title: 'Scan history',
      delta: (points: number) => (points > 0 ? `+${points}` : `${points}`),
    },
    streak: {
      title: 'Weekly streak',
      weeks: (count: number) => (count === 1 ? '1 week' : `${count} weeks`),
      restart: "Let's start a new one. One scan this week gets it going.",
    },
    compare: {
      title: 'Before and after',
      before: 'Before',
      after: 'After',
      pick: 'Choose a scan',
      elapsed: (days: number) => (days === 1 ? '1 day apart' : `${days} days apart`),
      needTwo: 'You need two scans to compare. Take another scan next week.',
      sliderLabel: 'Drag to compare before and after',
    },
  },

  routine: {
    title: 'Your routine',
    morning: 'Morning',
    evening: 'Evening',
    completion: (done: number, total: number) => `${done} of ${total} done today`,
    consistency: 'Consistency over weeks is what shows up in your scans.',
    empty: {
      title: 'Your routine appears after your first scan',
      body: "We'll suggest a few simple morning and evening steps based on how your skin looks.",
      cta: 'Take a scan',
    },
    saveFailed: "That didn't save. We'll try again when you're back online.",
  },

  notifications: {
    permission: {
      title: 'A weekly nudge?',
      body: 'We can remind you once a week to take your scan, on the day and time you choose. At most one notification a day, and you can turn it off any time.',
      allow: 'Turn on reminders',
      notNow: 'Not now',
      deniedBody: 'Reminders are off. You can turn them on in your phone settings.',
    },
    weeklyRescan: [
      { title: 'Time for your weekly scan', body: "It's been a week. Curious how things look?" },
      { title: 'Your weekly check-in', body: 'One photo shows how this week went.' },
      { title: 'How did this week go?', body: 'A quick scan adds another point to your progress.' },
    ],
    routineMorning: {
      title: 'Morning routine',
      body: 'Your morning steps are ready when you are.',
    },
    routineEvening: { title: 'Evening routine', body: 'A few minutes of care before bed.' },
    streakAtRisk: {
      title: 'Keep your streak going',
      body: (weeks: number) => `You're on a ${weeks}-week streak. One scan today keeps it going.`,
    },
  },

  paywall: {
    title: 'See your progress, week by week',
    valuePoints: [
      'A new scan whenever you want one',
      'Your full history and trend over time',
      'Before-and-after comparisons',
      'A daily routine you can tick off',
    ],
    bestValue: (percent: number) => `Best value, save ${percent}% vs weekly`,
    plans: {
      weekly: 'Weekly',
      monthly: 'Monthly',
      annual: 'Annual',
    },
    pricePer: {
      weekly: (price: string) => `${price} per week`,
      monthly: (price: string) => `${price} per month`,
      annual: (price: string) => `${price} per year`,
    },
    startTrial: (days: number) => `Start ${days}-day free trial`,
    subscribe: 'Subscribe',
    trialTerms: (days: number, price: string, period: string) =>
      `Free for ${days} days, then ${price} per ${period}. Renews automatically until you cancel. Cancel any time in Google Play.`,
    terms: (price: string, period: string) =>
      `${price} per ${period}. Renews automatically until you cancel. Cancel any time in Google Play.`,
    restore: 'Restore purchases',
    termsLink: 'Terms',
    privacyLink: 'Privacy Policy',
    close: 'Close',
    outcomes: {
      success: "You're subscribed. Welcome in.",
      cancelled: 'Purchase cancelled. Nothing was charged.',
      pending: "Your payment is pending. We'll unlock everything as soon as it goes through.",
      alreadySubscribed: "You're already subscribed.",
      storeUnavailable: "Google Play isn't available right now. Try again in a moment.",
      failed: "The purchase didn't go through. Nothing was charged.",
      restored: 'Your subscription has been restored.',
      nothingToRestore: "We couldn't find a previous subscription on this account.",
    },
    lapsed:
      'Your subscription has ended. Your history is still here, and you can subscribe again to keep scanning.',
  },

  settings: {
    title: 'Settings',
    account: {
      title: 'Account',
      signedInAs: (email: string) => `Signed in as ${email}`,
      anonymous:
        'Your progress is only on this phone. Add your email to keep it if you change phones.',
    },
    subscription: {
      title: 'Subscription',
      plan: (plan: string) => `Plan: ${plan}`,
      renews: (date: string) => `Renews on ${date}`,
      none: 'No active subscription',
      manage: 'Manage subscription',
    },
    reminders: {
      title: 'Reminders',
      master: 'Allow reminders',
      weekly: 'Weekly scan reminder',
      day: 'Day',
      time: 'Time',
      morning: 'Morning routine reminder',
      evening: 'Evening routine reminder',
    },
    data: {
      title: 'Your data',
      download: 'Download my data',
      downloadBody: 'Exports your scans, scores and routines as a file you can keep.',
      deletePhotos: 'Delete all my scan photos',
      deletePhotosBody:
        'Removes every photo from our storage. Your scores and history stay, but you won’t be able to compare photos.',
      deletePhotosConfirm: 'Delete photos',
      deletePhotosDone: 'Your photos have been deleted.',
      deleteAccount: 'Delete my account',
    },
    deleteAccount: {
      title: 'Delete your account',
      body: 'This permanently deletes your account, every scan photo, all your scores, your routine and your history. It cannot be undone.',
      subscriptionNote:
        'Deleting your account does not cancel a Google Play subscription. Cancel it in Google Play first.',
      typeToConfirm: 'Type DELETE to confirm',
      confirmWord: 'DELETE',
      confirm: 'Delete everything',
      deleting: 'Deleting your account',
      done: 'Your account and all your data have been deleted.',
    },
    about: {
      title: 'About',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      disclaimer: 'About your results',
      version: (version: string) => `Version ${version}`,
      support: 'Contact support',
    },
  },

  errors: {
    generic: "Something didn't load. Check your connection and try again.",
    offline: "You're offline. Check your connection and try again.",
    timeout: 'This is taking too long. Check your connection and try again.',
    sessionExpired: 'You were signed out. Sign in again to continue.',
    /** Codes returned by the analyze-scan Edge Function. */
    scan: {
      UNAUTHORIZED: 'You were signed out. Sign in again to continue.',
      NOT_FOUND: "We couldn't find that scan. Try taking it again.",
      ALREADY_PROCESSED: 'That scan has already been processed.',
      IMAGE_TOO_LARGE: 'That photo is too large. Try taking it again.',
      MODEL_TIMEOUT: 'Your scan took too long to process. Try again.',
      MODEL_INVALID_RESPONSE: "Your scan didn't finish properly. Try again.",
      SUBSCRIPTION_REQUIRED: 'Subscribe to take another scan.',
      INTERNAL: 'Something went wrong on our side. Try again in a moment.',
    },
    upload: "Your photo didn't upload. Check your connection and try again.",
  },

  disclaimers: {
    short: 'A cosmetic estimate from a photo, not professional skincare advice.',
    full:
      'GlowTrack gives cosmetic estimates of how your skin looks in a photo. Lighting and ' +
      "camera quality affect the results. It isn't a substitute for advice from a qualified " +
      'professional, so if anything about your skin worries you, please see one.',
    referral:
      "Some things are better looked at in person than in a photo. A qualified skincare professional is the right person for anything GlowTrack can't assess.",
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

export type Copy = typeof copy;
