import {
  AGE_BANDS,
  CONCERNS,
  GOALS,
  MAX_CONCERNS,
  SKIN_TYPES,
  type AgeBand,
  type Concern,
  type Goal,
  type SkinType,
} from '@/constants/onboarding';
import type { Profile, ProfileUpdate } from '@/types/profile';

/** The onboarding steps in order. The first five are counted by the progress indicator. */
export const ONBOARDING_STEPS = [
  'welcome',
  'ageBand',
  'skinType',
  'concerns',
  'goal',
  'ready',
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Steps shown as "Step n of 5". The final summary step sits outside the count. */
export const COUNTED_STEPS = 5;

export interface OnboardingAnswers {
  ageBand: AgeBand | null;
  skinType: SkinType | null;
  concerns: Concern[];
  goal: Goal | null;
}

export function isOnboarded(profile: Profile | null): boolean {
  return profile?.onboarding_completed_at != null;
}

function isOneOf<T extends string>(options: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (options as readonly string[]).includes(value);
}

/** Reads saved answers from the profile, dropping any value the app doesn't recognise. */
export function answersFromProfile(profile: Profile): OnboardingAnswers {
  return {
    ageBand: isOneOf(AGE_BANDS, profile.age_band) ? profile.age_band : null,
    skinType: isOneOf(SKIN_TYPES, profile.skin_type) ? profile.skin_type : null,
    concerns: profile.concerns
      .filter((concern): concern is Concern => isOneOf(CONCERNS, concern))
      .slice(0, MAX_CONCERNS),
    goal: isOneOf(GOALS, profile.primary_goal) ? profile.primary_goal : null,
  };
}

/**
 * Where to pick up after the flow was left part-way: the first unanswered
 * question, or the welcome step if nothing has been answered yet.
 */
export function resumeStep(answers: OnboardingAnswers): OnboardingStep {
  if (answers.ageBand === null) return 'welcome';
  if (answers.skinType === null) return 'skinType';
  if (answers.concerns.length === 0) return 'concerns';
  if (answers.goal === null) return 'goal';
  return 'ready';
}

/** Whether the step's primary button is enabled. */
export function canContinue(step: OnboardingStep, answers: OnboardingAnswers): boolean {
  switch (step) {
    case 'welcome':
    case 'ready':
      return true;
    case 'ageBand':
      return answers.ageBand !== null;
    case 'skinType':
      return answers.skinType !== null;
    case 'concerns':
      return answers.concerns.length > 0 && answers.concerns.length <= MAX_CONCERNS;
    case 'goal':
      return answers.goal !== null;
  }
}

/**
 * The profile write for a step's answer, or null when there is nothing new to
 * save (a step without an answer, or an answer already stored).
 */
export function changesForStep(
  step: OnboardingStep,
  answers: OnboardingAnswers,
  profile: Profile,
): ProfileUpdate | null {
  switch (step) {
    case 'welcome':
    case 'ready':
      return null;
    case 'ageBand':
      return answers.ageBand === profile.age_band ? null : { age_band: answers.ageBand };
    case 'skinType':
      return answers.skinType === profile.skin_type ? null : { skin_type: answers.skinType };
    case 'concerns':
      return answers.concerns.join() === profile.concerns.join()
        ? null
        : { concerns: answers.concerns };
    case 'goal':
      return answers.goal === profile.primary_goal ? null : { primary_goal: answers.goal };
  }
}
