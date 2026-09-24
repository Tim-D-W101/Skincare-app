# analyze-scan

Turns an uploaded scan photo into validated scores. The app uploads the photo,
inserts a `scans` row with status `pending`, then calls this function with the
scan id. The function checks the caller owns the scan, sends the photo to
Gemini, validates the reply and writes the result. The app follows the row's
status through Realtime.

```text
pending -> processing -> complete   (scores saved, free scan used up)
                      -> rejected   (photo unusable, free scan kept)
                      -> failed     (anything else, free scan kept)
```

## Files

| File            | What it holds                                                                  |
| --------------- | ------------------------------------------------------------------------------ |
| `index.ts`      | The HTTP handler: auth, ownership, status changes, saving the result.          |
| `analysis.ts`   | The model call, Zod validation and the single retry. Shared with calibration.  |
| `prompt.ts`     | The system prompt, response schema and `PROMPT_VERSION`. Versioned.            |
| `model.ts`      | The model name, endpoint, settings and prices. Swapping model is one line.     |
| `scoring.ts`    | Clamping and the weighted `overall`.                                           |
| `compliance.ts` | Rejects replies that use the banned vocabulary listed in `prompt.ts`.          |
| `deno.json`     | Dependency versions (Zod, supabase-js). Nothing here goes into the app bundle. |

## Secrets

The Gemini API key lives **only** here, as an Edge Function secret. Never put
it in the app, in the root `.env`, or anywhere with an `EXPO_PUBLIC_` prefix:
anything in the app can be pulled out of the APK.

1. Create a key in Google AI Studio.
2. Put it in `supabase/functions/.env` (gitignored, like every `.env` file):

   ```text
   GEMINI_API_KEY=your-key-here
   ```

3. Upload it. Using a file keeps the key out of your shell history:

   ```sh
   npx supabase login
   npx supabase secrets set --env-file supabase/functions/.env --project-ref yheevhjamvuxtnqudszk
   ```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to every hosted
Edge Function automatically. If `GEMINI_API_KEY` is missing, the function
refuses to start, and the error shows in its logs.

## Deploy

Run the migration first: paste `supabase/migrations/0003_scan_pipeline.sql`
into the SQL editor and run it. It turns on Realtime for `scans` and adds
`complete_scan()`, which the function calls. It's safe to run twice.

Then deploy the function:

```sh
npx supabase functions deploy analyze-scan --project-ref yheevhjamvuxtnqudszk
```

The Supabase gateway checks the caller's token before the function runs, and
the function checks it again itself. If the gateway check ever rejects valid
tokens (for example after moving the project to the newer JWT signing keys),
redeploy with `--no-verify-jwt`. The function's own check still applies.

## Check the ownership rule

Done when a request for someone else's scan returns 403. To try it:

1. Take a scan in the app, then copy its `id` from the `scans` table in the
   Supabase Table Editor.
2. Create a second, anonymous user and copy the `access_token` it returns (use
   the anon key from your `.env`):

   ```sh
   curl -s -X POST "https://yheevhjamvuxtnqudszk.supabase.co/auth/v1/signup" \
     -H "apikey: YOUR_ANON_KEY" -H "Content-Type: application/json" -d '{}'
   ```

3. Call the function as that second user:

   ```sh
   curl -i -X POST "https://yheevhjamvuxtnqudszk.supabase.co/functions/v1/analyze-scan" \
     -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer ACCESS_TOKEN_FROM_STEP_2" \
     -H "Content-Type: application/json" \
     -d '{"scanId":"SCAN_ID_FROM_STEP_1"}'
   ```

   Expect `403` with `{"ok":false,"code":"FORBIDDEN"}`. The scan is untouched.

## Error codes

Every error response is `{ "ok": false, "code": "..." }`. The app maps codes to
messages in `src/constants/copy.ts` (`errors.scan`); unknown codes fall back to
the `INTERNAL` message.

| HTTP | Code                     | Meaning                                                   |
| ---- | ------------------------ | --------------------------------------------------------- |
| 400  | `BAD_REQUEST`            | The body has no valid `scanId`.                           |
| 401  | `UNAUTHORIZED`           | Missing or invalid access token.                          |
| 403  | `FORBIDDEN`              | The scan belongs to someone else.                         |
| 404  | `NOT_FOUND`              | No scan with that id.                                     |
| 405  | `METHOD_NOT_ALLOWED`     | Anything other than POST.                                 |
| 409  | `ALREADY_PROCESSED`      | The scan isn't `pending`. Makes retries safe to send.     |
| 413  | `IMAGE_TOO_LARGE`        | The photo is over 6 MB.                                   |
| 502  | `MODEL_INVALID_RESPONSE` | Two replies in a row failed validation.                   |
| 504  | `MODEL_TIMEOUT`          | Gemini didn't answer within 25 seconds.                   |
| 500  | `INTERNAL`               | Anything else: Gemini errors, database or storage errors. |

Once a scan is claimed, every failure leaves it `failed` with the code in
`failure_reason`, and a rejected photo leaves it `rejected` with the reason
(for example `too_dark`).

## Logs

Dashboard → Edge Functions → analyze-scan → Logs. One line per scan with its
id, outcome, model, prompt version, attempts, tokens and estimated cost, plus
one line per error. The photo, its base64 data and the model's text are never
logged.

## Changing the model or the prompt

- Model: edit `name` (and the prices) in `model.ts`.
- Prompt: edit `prompt.ts` and bump `PROMPT_VERSION`, following the rules at
  the top of that file.

Either way, rerun the calibration harness before deploying:
`npm run calibrate` (see `scripts/README.md`).

## Type-check locally

```sh
cd supabase/functions/analyze-scan
npx deno check index.ts
npx deno lint
```
