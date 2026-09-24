/**
 * Calibration harness for the scan scorer.
 *
 * Runs every photo in scripts/fixtures/ through the same prompt, model,
 * validation and retry as the analyze-scan Edge Function (it imports the
 * function's own analysis module), three times each, then writes
 * scripts/calibration-report.md and prints a summary.
 *
 * Run from the repository root:  npm run calibrate
 * Setup and how to read the results: scripts/README.md
 */
import { Buffer } from 'node:buffer';

import {
  AnalysisError,
  analyseImage,
  type Attempt,
  type RejectedAnalysis,
  type ScoredAnalysis,
} from '../supabase/functions/analyze-scan/analysis.ts';
import { findBannedTerms } from '../supabase/functions/analyze-scan/compliance.ts';
import { MODEL } from '../supabase/functions/analyze-scan/model.ts';
import { ATTRIBUTE_KEYS, PROMPT_VERSION } from '../supabase/functions/analyze-scan/prompt.ts';

const RUNS = 3;
/** Build plan gate: mean run-to-run variation per attribute, in points. */
const TARGET_SPREAD = 5;
/** Flag any image whose runs disagree by more than this on any attribute. */
const DISAGREEMENT_POINTS = 8;
/** The app sends photos of roughly this size; much larger fixtures may score differently. */
const APP_PHOTO_BYTES = 500 * 1024;
const LARGE_FIXTURE_BYTES = 3 * APP_PHOTO_BYTES;
/** Gemini's inline image limit is 20 MB per request; stay well under it. */
const MAX_FIXTURE_BYTES = 15 * 1024 * 1024;
/** Waits between rate-limited retries of one run, before giving up on it. */
const RATE_LIMIT_WAITS_MS = [20_000, 40_000, 60_000];

const FIXTURES_DIR = new URL('./fixtures/', import.meta.url);
const REPORT_FILE = new URL('./calibration-report.md', import.meta.url);

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const SCORED_KEYS = ['overall', ...ATTRIBUTE_KEYS] as const;
type ScoredKey = (typeof SCORED_KEYS)[number];

type RunOutcome =
  | { kind: 'scored'; analysis: ScoredAnalysis }
  | { kind: 'rejected'; analysis: RejectedAnalysis }
  | { kind: 'error'; code: string; message: string; attempts: Attempt[] };

interface Fixture {
  name: string;
  bytes: number;
  runs: RunOutcome[];
}

interface Spread {
  range: number;
  sd: number;
}

// ---------------------------------------------------------------------------
// Running
// ---------------------------------------------------------------------------

function extension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

async function listFixtures(): Promise<string[]> {
  const names: string[] = [];
  try {
    for await (const entry of Deno.readDir(FIXTURES_DIR)) {
      if (entry.isFile && extension(entry.name) in MIME_TYPES) names.push(entry.name);
    }
  } catch (error: unknown) {
    if (error instanceof Deno.errors.NotFound) return [];
    throw error;
  }
  return names.sort();
}

function isRateLimited(error: unknown): boolean {
  return (
    error instanceof AnalysisError && error.code === 'INTERNAL' && /HTTP 429/.test(error.message)
  );
}

async function runOnce(
  image: { base64: string; mimeType: string },
  apiKey: string,
): Promise<RunOutcome> {
  for (let wait = 0; ; wait++) {
    try {
      const analysis = await analyseImage(image, apiKey);
      return analysis.usable ? { kind: 'scored', analysis } : { kind: 'rejected', analysis };
    } catch (error: unknown) {
      if (isRateLimited(error) && wait < RATE_LIMIT_WAITS_MS.length) {
        console.log(`    rate limited, waiting ${RATE_LIMIT_WAITS_MS[wait] / 1000}s`);
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WAITS_MS[wait]));
        continue;
      }
      if (error instanceof AnalysisError) {
        return {
          kind: 'error',
          code: error.code,
          message: error.message,
          attempts: error.attempts,
        };
      }
      return {
        kind: 'error',
        code: 'HARNESS',
        message: error instanceof Error ? error.message : String(error),
        attempts: [],
      };
    }
  }
}

function describeRun(run: RunOutcome): string {
  if (run.kind === 'scored') return `overall ${run.analysis.overall}`;
  if (run.kind === 'rejected') return `rejected (${run.analysis.rejectReason})`;
  return `error (${run.code})`;
}

// ---------------------------------------------------------------------------
// Measuring
// ---------------------------------------------------------------------------

function scoreOf(analysis: ScoredAnalysis, key: ScoredKey): number {
  return key === 'overall' ? analysis.overall : analysis.scores[key];
}

function spreadOf(values: number[]): Spread {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return { range: Math.max(...values) - Math.min(...values), sd: Math.sqrt(variance) };
}

function scoredRuns(fixture: Fixture): ScoredAnalysis[] {
  return fixture.runs.flatMap((run) => (run.kind === 'scored' ? [run.analysis] : []));
}

/** Spreads per key, only for images where every run was scored. */
function spreadsFor(fixture: Fixture): Record<ScoredKey, Spread> | null {
  const scored = scoredRuns(fixture);
  if (scored.length !== RUNS) return null;
  return Object.fromEntries(
    SCORED_KEYS.map((key) => [key, spreadOf(scored.map((analysis) => scoreOf(analysis, key)))]),
  ) as Record<ScoredKey, Spread>;
}

/** Every banned term found, in used replies and in replies that were retried because of them. */
function complianceFindings(fixture: Fixture): string[] {
  const findings: string[] = [];
  fixture.runs.forEach((run, index) => {
    const attempts = run.kind === 'error' ? run.attempts : run.analysis.attempts;
    attempts.forEach((attempt, attemptIndex) => {
      if (attempt.bannedTerms.length > 0) {
        findings.push(
          `run ${index + 1}, attempt ${attemptIndex + 1}: ${attempt.bannedTerms.join(', ')} (reply refused and retried)`,
        );
      }
    });
    if (run.kind === 'scored') {
      const text = [run.analysis.headline, ...run.analysis.observations].join('\n');
      const terms = findBannedTerms(text);
      if (terms.length > 0) {
        findings.push(`run ${index + 1}, final reply: ${terms.join(', ')} (SHOWN TO USERS)`);
      }
    }
  });
  return findings;
}

function usableAgreement(fixture: Fixture): string | null {
  const labels = fixture.runs.map((run) =>
    run.kind === 'scored' ? 'scored' : run.kind === 'rejected' ? run.analysis.rejectReason : null,
  );
  const known = labels.filter((label) => label !== null);
  return new Set(known).size > 1 ? known.join(' / ') : null;
}

function round1(value: number): string {
  return value.toFixed(1);
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

interface Summary {
  lines: string[];
  passed: boolean;
}

function summarise(fixtures: Fixture[]): Summary {
  const lines: string[] = [];
  const spreads = fixtures
    .map((fixture) => ({ fixture, spread: spreadsFor(fixture) }))
    .filter(
      (entry): entry is { fixture: Fixture; spread: Record<ScoredKey, Spread> } =>
        entry.spread !== null,
    );

  lines.push(
    `Images: ${fixtures.length}, of which ${spreads.length} were scored on all ${RUNS} runs.`,
  );

  let passed = spreads.length > 0;
  if (spreads.length > 0) {
    lines.push('', 'Run-to-run variation per attribute (mean across images, in points):');
    lines.push('', '| Attribute | Mean SD | Mean range | Within 5? |', '| --- | --- | --- | --- |');
    for (const key of SCORED_KEYS) {
      const meanSd = spreads.reduce((sum, entry) => sum + entry.spread[key].sd, 0) / spreads.length;
      const meanRange =
        spreads.reduce((sum, entry) => sum + entry.spread[key].range, 0) / spreads.length;
      const ok = meanSd <= TARGET_SPREAD;
      if (!ok) passed = false;
      lines.push(`| ${key} | ${round1(meanSd)} | ${round1(meanRange)} | ${ok ? 'yes' : 'NO'} |`);
    }
  } else {
    lines.push('', 'No image was scored on every run, so consistency could not be measured.');
  }

  const overalls = fixtures
    .map((fixture) => scoredRuns(fixture).map((analysis) => analysis.overall))
    .filter((values) => values.length > 0)
    .map((values) => values.reduce((sum, value) => sum + value, 0) / values.length)
    .sort((a, b) => a - b);
  if (overalls.length > 0) {
    const bands: [string, number, number][] = [
      ['25-40', 25, 40],
      ['41-55', 41, 55],
      ['56-70', 56, 70],
      ['71-85', 71, 85],
      ['86-95', 86, 95],
    ];
    lines.push('', 'Overall score distribution (mean per image):', '');
    lines.push(
      `min ${round1(overalls[0])}, median ${round1(overalls[Math.floor(overalls.length / 2)])}, max ${round1(overalls[overalls.length - 1])}`,
      '',
    );
    for (const [label, low, high] of bands) {
      const count = overalls.filter(
        (value) => Math.round(value) >= low && Math.round(value) <= high,
      ).length;
      lines.push(`    ${label}  ${'#'.repeat(count)} ${count}`);
    }
    const outside = overalls.filter(
      (value) => Math.round(value) < 25 || Math.round(value) > 95,
    ).length;
    if (outside > 0) lines.push(`    outside 25-95: ${outside}`);
  }

  const disagreements = spreads.flatMap(({ fixture, spread }) => {
    const keys = SCORED_KEYS.filter((key) => spread[key].range > DISAGREEMENT_POINTS);
    return keys.length > 0
      ? [`${fixture.name}: ${keys.map((key) => `${key} (${spread[key].range})`).join(', ')}`]
      : [];
  });
  lines.push('', `Images whose runs disagreed by more than ${DISAGREEMENT_POINTS} points:`);
  lines.push(...(disagreements.length > 0 ? disagreements.map((line) => `- ${line}`) : ['- none']));

  const splits = fixtures.flatMap((fixture) => {
    const split = usableAgreement(fixture);
    return split ? [`${fixture.name}: ${split}`] : [];
  });
  lines.push('', 'Images where runs disagreed on whether the photo was usable:');
  lines.push(...(splits.length > 0 ? splits.map((line) => `- ${line}`) : ['- none']));

  const compliance = fixtures.flatMap((fixture) =>
    complianceFindings(fixture).map((finding) => `${fixture.name}, ${finding}`),
  );
  lines.push('', 'Banned vocabulary:');
  lines.push(...(compliance.length > 0 ? compliance.map((line) => `- ${line}`) : ['- none']));

  const errors = fixtures.flatMap((fixture) =>
    fixture.runs.flatMap((run, index) =>
      run.kind === 'error'
        ? [`${fixture.name}, run ${index + 1}: ${run.code}: ${run.message}`]
        : [],
    ),
  );
  lines.push('', 'Errors:');
  lines.push(...(errors.length > 0 ? errors.map((line) => `- ${line}`) : ['- none']));

  let calls = 0;
  let cost = 0;
  for (const fixture of fixtures) {
    for (const run of fixture.runs) {
      const attempts = run.kind === 'error' ? run.attempts : run.analysis.attempts;
      calls += attempts.length;
      cost += attempts.reduce((sum, attempt) => sum + (attempt.usage?.costUsd ?? 0), 0);
    }
  }
  lines.push('', `Model calls: ${calls}, estimated cost: $${cost.toFixed(4)}.`);
  lines.push(
    '',
    passed ? 'RESULT: within the gate.' : 'RESULT: NOT within the gate. See scripts/README.md.',
  );

  return { lines, passed };
}

function fixtureSection(fixture: Fixture): string[] {
  const lines = [`## ${fixture.name}`, ''];
  if (fixture.bytes > LARGE_FIXTURE_BYTES) {
    lines.push(
      `Note: ${Math.round(fixture.bytes / 1024)} KB, far larger than the photos the app sends. Scores may differ from real scans.`,
      '',
    );
  }

  const header = `| | ${fixture.runs.map((_, index) => `Run ${index + 1}`).join(' | ')} | Range | SD |`;
  lines.push(header, `|${' --- |'.repeat(fixture.runs.length + 3)}`);
  lines.push(`| result | ${fixture.runs.map(describeRun).join(' | ')} | | |`);

  const spreads = spreadsFor(fixture);
  for (const key of SCORED_KEYS) {
    const cells = fixture.runs.map((run) =>
      run.kind === 'scored' ? String(scoreOf(run.analysis, key)) : '-',
    );
    const spread = spreads?.[key];
    const range = spread ? `${spread.range}${spread.range > DISAGREEMENT_POINTS ? ' !' : ''}` : '';
    lines.push(`| ${key} | ${cells.join(' | ')} | ${range} | ${spread ? round1(spread.sd) : ''} |`);
  }
  lines.push('');

  const first = fixture.runs[0];
  if (first?.kind === 'scored') {
    const { analysis } = first;
    lines.push(`**Headline (run 1):** ${analysis.headline}`, '', '**Observations (run 1):**', '');
    lines.push(...analysis.observations.map((observation) => `- ${observation}`), '');
    lines.push(`**Focus areas (run 1):** ${analysis.focusAreas.join(', ')}`, '');
    lines.push(
      `**Model's own overall (run 1):** ${analysis.modelOverall}, recomputed ${analysis.overall}`,
      '',
    );
  }

  const referrals = fixture.runs.flatMap((run, index) =>
    run.kind === 'scored' && run.analysis.referToProfessional ? [index + 1] : [],
  );
  if (referrals.length > 0)
    lines.push(`**Refer to professional:** runs ${referrals.join(', ')}`, '');

  const retries = fixture.runs.flatMap((run, index) => {
    const attempts = run.kind === 'error' ? run.attempts : run.analysis.attempts;
    return attempts
      .filter((attempt) => attempt.problem !== null)
      .map((attempt) => `run ${index + 1}: ${attempt.problem}`);
  });
  if (retries.length > 0) {
    lines.push('**Replies not used:**', '', ...retries.map((retry) => `- ${retry}`), '');
  }

  const compliance = complianceFindings(fixture);
  if (compliance.length === 0) lines.push('**Compliance:** clean', '');
  else lines.push('**Compliance:**', '', ...compliance.map((finding) => `- ${finding}`), '');
  return lines;
}

function buildReport(fixtures: Fixture[], summary: Summary): string {
  return [
    '# Calibration report',
    '',
    `Model \`${MODEL.name}\` (temperature ${MODEL.generation.temperature}, thinking ${MODEL.generation.thinkingLevel}), prompt \`${PROMPT_VERSION}\`, ${RUNS} runs per image, ${new Date().toISOString()}.`,
    '',
    'Scores are after server-side clamping, and `overall` is the recomputed weighted mean, exactly as the app would receive them. SD is the standard deviation across runs, in points; range is highest minus lowest.',
    '',
    '## Summary',
    '',
    ...summary.lines,
    '',
    ...fixtures.flatMap(fixtureSection),
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<number> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    console.error(
      'GEMINI_API_KEY is not set. Put it in supabase/functions/.env (see scripts/README.md).',
    );
    return 1;
  }

  const names = await listFixtures();
  if (names.length === 0) {
    console.error(
      'No images in scripts/fixtures/. Add .jpg, .png or .webp photos (see scripts/README.md).',
    );
    return 1;
  }

  console.log(
    `Calibrating ${MODEL.name}, prompt ${PROMPT_VERSION}: ${names.length} images x ${RUNS} runs\n`,
  );

  const fixtures: Fixture[] = [];
  for (const name of names) {
    const data = await Deno.readFile(new URL(name, FIXTURES_DIR));
    const fixture: Fixture = { name, bytes: data.byteLength, runs: [] };
    fixtures.push(fixture);

    if (data.byteLength > MAX_FIXTURE_BYTES) {
      console.log(`${name}: skipped, over ${MAX_FIXTURE_BYTES / 1024 / 1024} MB`);
      fixture.runs.push({
        kind: 'error',
        code: 'HARNESS',
        message: 'File too large to send',
        attempts: [],
      });
      continue;
    }
    if (data.byteLength > LARGE_FIXTURE_BYTES) {
      console.log(`${name}: ${Math.round(data.byteLength / 1024)} KB, much larger than app photos`);
    }

    const image = {
      base64: Buffer.from(data).toString('base64'),
      mimeType: MIME_TYPES[extension(name)],
    };
    for (let run = 1; run <= RUNS; run++) {
      const outcome = await runOnce(image, apiKey);
      fixture.runs.push(outcome);
      console.log(`  ${name}  run ${run}/${RUNS}: ${describeRun(outcome)}`);
    }
  }

  const summary = summarise(fixtures);
  await Deno.writeTextFile(REPORT_FILE, buildReport(fixtures, summary));

  console.log(`\n${summary.lines.join('\n')}\n\nFull report: scripts/calibration-report.md`);
  return summary.passed ? 0 : 2;
}

Deno.exit(await main());
