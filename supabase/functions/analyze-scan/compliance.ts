import { BANNED_TERMS } from './prompt.ts';

/**
 * Longer words that start with a banned term but are fine to show. Any other
 * word that starts with one, such as a plural or past tense, counts as the
 * term itself.
 */
const ALLOWED_WORDS = new Set(['health', 'healthy', 'healthier', 'healthiest', 'healthily']);

const HYPHEN_OR_SPACE = '[\\s\\-\\u2010-\\u2015]+';

const PATTERNS = BANNED_TERMS.map((term) => ({
  term,
  // Word start, the term (spaces and hyphens interchangeable), then any
  // letters that follow, so inflected forms are caught too.
  pattern: new RegExp(`\\b${term.split(/[\s-]+/).join(HYPHEN_OR_SPACE)}[a-z]*`, 'gi'),
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
