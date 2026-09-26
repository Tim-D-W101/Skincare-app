import { BANNED_TERMS, ROUTINE_BANNED_PHRASES, ROUTINE_INGREDIENT_TERMS } from './prompt.ts';

/**
 * Longer words that start with a banned term but are fine to show. Any other
 * word that starts with one, such as a plural or past tense, counts as the
 * term itself.
 */
const ALLOWED_WORDS = new Set(['health', 'healthy', 'healthier', 'healthiest', 'healthily']);

const HYPHEN_OR_SPACE = '[\\s\\-\\u2010-\\u2015]+';

function termPattern(term: string): string {
  return term.split(/[\s-]+/).join(HYPHEN_OR_SPACE);
}

const PATTERNS = BANNED_TERMS.map((term) => ({
  term,
  // Word start, the term (spaces and hyphens interchangeable), then any
  // letters that follow, so inflected forms are caught too.
  pattern: new RegExp(`\\b${termPattern(term)}[a-z]*`, 'gi'),
}));

/** Returns the banned terms that appear in the text, or an empty list. */
export function findBannedTerms(text: string): string[] {
  const found = new Set<string>();
  for (const { term, pattern } of PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      if (!ALLOWED_WORDS.has(match[0].toLowerCase())) found.add(term);
    }
  }
  return [...found];
}

// Whole words only, with an optional plural "s", so short terms like "aha"
// don't match inside longer words.
const ROUTINE_PATTERNS = [...ROUTINE_INGREDIENT_TERMS, ...ROUTINE_BANNED_PHRASES].map((term) => ({
  term,
  pattern: new RegExp(`\\b${termPattern(term)}s?\\b`, 'i'),
}));

/**
 * Everything a routine's text must not contain, beyond the banned vocabulary:
 * ingredient names, instructions, frequencies, promises, numbers (amounts,
 * strengths, percentages) and trademark symbols (brand names). Returns what
 * was found, or an empty list.
 */
export function findRoutineProblems(text: string): string[] {
  const found: string[] = [];
  for (const { term, pattern } of ROUTINE_PATTERNS) {
    if (pattern.test(text)) found.push(term);
  }
  if (/\d/.test(text)) found.push('a number');
  if (/[®™©]/.test(text)) found.push('a trademark symbol');
  return found;
}
