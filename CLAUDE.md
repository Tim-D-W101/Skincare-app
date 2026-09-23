# CLAUDE.md

Read this at the start of every session. These rules are binding.

## 1. PROJECT

GlowTrack is a cosmetic skincare progress tracker for Android (iOS later). The
user photographs their face and gets a set of cosmetic appearance scores back
within seconds. Those scores are tracked over weeks so the user can see whether
their routine is working — the scan is the hook, the progress graph is the
product.

Planning documents — the phase roadmap, specs, briefs — live in
`docs/reference/`, committed to the repository. Read what is there before
starting work. A document attached to a chat does not survive into the next
session; only a committed file does.

## 2. STACK

| Layer         | Choice                                             |
| ------------- | -------------------------------------------------- |
| Framework     | React Native via Expo, TypeScript                  |
| Routing       | Expo Router (file-based)                           |
| State         | Zustand                                            |
| Backend       | Supabase — auth, database, storage, Edge Functions |
| Subscriptions | RevenueCat                                         |
| Styling       | StyleSheet with tokens from `src/theme/tokens.ts`  |
| Builds        | EAS Build (cloud)                                  |

Android first. iOS comes later via EAS cloud builds — there is no Mac in this
project, so never suggest a workflow that requires one.

## 3. COMPLIANCE — THE MOST IMPORTANT SECTION

**This is a BEAUTY app, not a medical app. Store approval depends on it.**

Google lists "skin care" under its Medical category, which triggers a mandatory
Health apps declaration in Play Console. The app is listed under Beauty and
every string stays non-medical. Get this wrong and the project inherits a
documentation burden designed for regulated medical devices.

### NEVER use these words

Not in any user-facing string, code comment, variable name, commit message, or
store copy:

> diagnose, diagnosis, condition, disease, disorder, symptom, treat, treatment,
> cure, heal, therapy, medical, clinical, patient, prescription,
> dermatologist-grade, medically proven, acne vulgaris, rosacea, eczema,
> psoriasis, dermatitis, melasma, lesion

### ALWAYS use this vocabulary instead

> the appearance of, looks, visible, cosmetic, routine, care, skincare,
> clarity, texture, evenness, glow

### Disclaimer

Every screen that shows a score must display the disclaimer from
`src/constants/copy.ts`. No exceptions.

## 4. ARCHITECTURE

```
app/                    Expo Router routes ONLY — no business logic here
  (auth)/               sign-in flow
  (onboarding)/         the intake quiz
  (tabs)/               main tab navigator
  scan/                 camera and scan flow
src/
  components/ui/        shared primitives (Button, Card, Text, Screen, ...)
  components/scan/      camera and scan-specific components
  components/progress/  timeline, comparison, trend components
  lib/                  clients, API wrappers, helpers (supabase.ts, errors.ts)
  stores/               Zustand stores, one per domain
  theme/                design tokens
  types/                shared and generated types
  constants/            copy.ts and other constants
supabase/
  migrations/           SQL migrations, ordered
  functions/            Edge Functions — server-only secrets live here
assets/                 icons, splash, fonts
```

`@/...` resolves to `src/...`.

**ALL user-facing strings live in `src/constants/copy.ts` and are imported from
there. Never hardcode a user-facing string in a component.**

## 5. CONVENTIONS

- Functional components with typed props. No class components.
- Named exports everywhere, except Expo Router route files, which must
  default-export.
- No `any`. Use `unknown` and narrow it.
- Every async call that can fail has explicit error handling and a user-visible
  error state. No silent catches.
- Every list has an empty state and a loading state.
- Colours, spacing, radii and font sizes come from `src/theme/tokens.ts`. Never
  a hardcoded hex value or magic number in a component.
- Accessibility labels on every touchable.

## 6. SECURITY

- Only `EXPO_PUBLIC_*` variables may be referenced in app code.
- The Gemini API key and the Supabase service role key exist ONLY in Supabase
  Edge Function secrets. If you are ever about to put either in the app, stop
  and tell me instead.
- Every table has row-level security enabled.

## 7. DEFINITION OF DONE

A change is done when:

1. `npx tsc --noEmit` passes.
2. The app runs on device without a red screen.
3. Loading and error states exist.
4. No new hardcoded strings or colours.
5. No secrets are in the diff.

## 8. WHAT NOT TO DO

- Do not add dependencies without asking.
- Do not refactor files unrelated to the current task.
- Do not add features I did not ask for.
- Do not write tests unless asked.
- Do not change `app.json`, `eas.json` or any migration file without telling me
  explicitly.
