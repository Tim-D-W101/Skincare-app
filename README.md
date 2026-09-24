# GlowTrack

A cosmetic skincare progress tracker. You photograph your face, get cosmetic
appearance scores, and track those scores over weeks to see whether your
routine is working.

This is a **beauty** app, and it has to stay one — store approval depends on
it. See the compliance section of `CLAUDE.md` for the language rules, and
follow them in code, copy and commit messages alike.

## Prerequisites

| Tool    | Notes                                                      |
| ------- | ---------------------------------------------------------- |
| Node.js | LTS (the major version in `.nvmrc`). Check with `node -v`  |
| Git     | Check with `git --version`                                 |
| Expo Go | Installed on a physical Android phone, from the Play Store |

Your phone and your computer must be on the same Wi-Fi network. On Windows,
keep the project in a plain path such as `C:\dev\` — OneDrive's file syncing
breaks `node_modules`.

## Install

```bash
npm install
cp .env.example .env
```

Then fill in `.env`. Every key is an `EXPO_PUBLIC_*` value that is safe to ship
in the app. The Gemini API key and the Supabase service role key are **not**
in this file and must never be — they belong in Supabase Edge Function secrets
only.

## Run

```bash
npm start
```

Scan the QR code with Expo Go on your Android phone. If your network blocks
device-to-device traffic (common on guest and corporate Wi-Fi):

```bash
npx expo start --tunnel
```

## Checks

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
npm run format      # Prettier, writes in place
npx expo-doctor     # project health
```

CI runs `typecheck` and `lint` on every push and pull request to `main`.

## Database types

`src/types/database.ts` is generated from the live Supabase schema. **Re-run
this after every migration**, or the app's types drift from the database:

```bash
npx supabase login     # once per machine
npm run types:db
```

`types:db` runs the Supabase CLI through `npx`, so it is not a project
dependency. Never edit `database.ts` by hand.

## Auth settings

Every new install is signed in anonymously, and email sign-in uses emailed
links. The app can't start until these are set in the Supabase dashboard:

1. **Authentication → Sign In / Providers:** turn on **Allow anonymous
   sign-ins**, and **Allow manual linking**, which Supabase requires for
   turning an anonymous user into one with an email.
2. **Authentication → URL Configuration → Redirect URLs:** add
   `glowtrack://**` (installed builds) and `exp://**` (Expo Go). Email links
   only return to the app if their redirect is on this list.

Anonymous sign-ins are limited to 30 per hour per IP address by default
(**Authentication → Rate Limits**). Repeated reinstalls while testing can hit
that limit.

## Scan pipeline

Scans are scored by the `analyze-scan` Edge Function, which is the only place
the Gemini key exists. To set it up:

1. Run `supabase/migrations/0003_scan_pipeline.sql` in the SQL editor. It
   turns on Realtime for `scans`, which the app uses to follow each scan.
2. Set the `GEMINI_API_KEY` secret and deploy the function, as described in
   `supabase/functions/analyze-scan/README.md`.
3. Run the calibration harness before trusting the scores:
   `npm run calibrate` (see `scripts/README.md`).

## Build

Cloud builds run on EAS, so no Mac is needed for iOS later.

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview   # installable APK for testing
eas build --platform android --profile production
```

## Layout

```
app/          Expo Router routes only
  (auth)/     sign-in flow
  (onboarding)/
  (tabs)/     main tab navigator
  scan/       camera and scan flow
src/
  components/ui/         shared primitives
  components/scan/
  components/progress/
  lib/                   clients and helpers
  stores/                Zustand stores
  theme/                 design tokens
  types/                 shared types
  constants/             all user-facing copy
supabase/
  migrations/
  functions/             Edge Functions (Deno)
scripts/                 calibration harness (Deno)
assets/
```

`@/...` resolves to `src/...`.
