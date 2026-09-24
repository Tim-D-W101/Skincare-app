# Calibration harness

`calibrate.ts` checks that the scorer is consistent before anything is built
on top of it. It sends every photo in `fixtures/` to the model three times,
using the Edge Function's own prompt, model, validation and retry, and
measures how much the scores move between runs.

This is the acceptance gate for the product. If the same photo scores 72, 61
and 80, the progress graph measures model noise, not skin.

## Setup (once)

1. **Node** is all you need: the command fetches Deno on first run with
   `npx`. Nothing is added to the project.
2. **API key.** Put your Gemini key in `supabase/functions/.env`, the same
   gitignored file used to upload the Edge Function secret:

   ```text
   GEMINI_API_KEY=your-key-here
   ```

   The key stays on your machine and in Supabase secrets. It is never part of
   the app.

3. **Photos.** Put 15 to 20 photos in `scripts/fixtures/` (`.jpg`, `.png` or
   `.webp`). See `fixtures/README.md` for the mix. They are gitignored and
   must never be committed.

## Run

From the repository root:

```sh
npm run calibrate
```

Each image takes a few seconds per run. On the free Gemini tier the script
may pause when it hits the rate limit; it waits and carries on.

It prints a summary and writes the full detail to
`scripts/calibration-report.md` (also gitignored, since it describes the
people in your photos). It exits with code 0 when every attribute is within
the gate and 2 when one isn't.

## Reading the report

For each image: the three score sets side by side, with the range (highest
minus lowest) and standard deviation (SD, in points) per attribute, the
headline and observations from run one, any replies that were refused and
retried, and a compliance check for banned vocabulary.

The summary gives:

- **Mean SD per attribute.** The gate: every attribute at or under about
  5 points.
- **Overall score distribution.** Most real photos should land between 55 and 85.
- **Images that disagreed by more than 8 points** on any attribute.
- **Images where runs disagreed** on whether the photo was usable.
- **Banned vocabulary.** Replies using it are refused and retried, so users
  never see them, but a high count means the prompt needs work.
- **Estimated cost** of the run.

## If it fails the gate

In this order, rerunning after each change:

1. **Temperature.** `model.ts` uses 0.2, as the build plan asks. Google
   recommends leaving Gemini 3 models at their default of 1.0, so try 1.0.
2. **Anchor the rubric.** Make the scoring bands in `prompt.ts` more concrete
   for the attributes that move most. Bump `PROMPT_VERSION`.
3. **Move up a model tier** in `model.ts`.

Commit prompt and model changes only once the report passes.
