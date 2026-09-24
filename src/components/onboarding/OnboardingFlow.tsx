import { router, useFocusEffect } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  PanResponder,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { Button, Screen, Text } from '@/components/ui';
import { copy } from '@/constants/copy';
import { MAX_CONCERNS, type Concern } from '@/constants/onboarding';
import {
  ONBOARDING_STEPS,
  answersFromProfile,
  canContinue,
  changesForStep,
  resumeStep,
  type OnboardingAnswers,
  type OnboardingStep,
} from '@/lib/onboarding';
import { useAuthStore } from '@/stores/useAuthStore';
import { motion, spacing } from '@/theme/tokens';
import type { Profile, ProfileUpdate } from '@/types/profile';

import { OnboardingHeader } from './OnboardingHeader';
import {
  AgeBandStep,
  ConcernsStep,
  GoalStep,
  ReadyStep,
  SkinTypeStep,
  WelcomeStep,
} from './OnboardingSteps';

/**
 * The onboarding flow: welcome, four questions, then a summary.
 *
 * Each answer is saved to the profile before moving on, so leaving part-way
 * loses nothing, and reopening the app resumes at the first unanswered step.
 * Steps slide horizontally and can be swiped; swiping forward is the same as
 * pressing Continue, so no step can be skipped.
 */
export function OnboardingFlow() {
  const profile = useAuthStore((state) => state.profile);
  // The root layout only shows onboarding once the profile has loaded.
  if (!profile) return null;
  return <OnboardingPager profile={profile} />;
}

function primaryLabel(step: OnboardingStep): string {
  if (step === 'welcome') return copy.onboarding.welcome.start;
  if (step === 'ready') return copy.onboarding.ready.cta;
  return copy.common.continue;
}

interface OnboardingPagerProps {
  /** The latest saved profile. Answers start from it, then live here until saved. */
  profile: Profile;
}

function OnboardingPager({ profile }: OnboardingPagerProps) {
  const { width } = useWindowDimensions();
  const updateProfile = useAuthStore((state) => state.updateProfile);

  const [answers, setAnswers] = useState(() => answersFromProfile(profile));
  const [stepIndex, setStepIndex] = useState(() =>
    ONBOARDING_STEPS.indexOf(resumeStep(answersFromProfile(profile))),
  );
  const [position] = useState(() => new Animated.Value(stepIndex));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const step = ONBOARDING_STEPS[stepIndex];
  const translateX = useMemo(() => Animated.multiply(position, -width), [position, width]);

  const goTo = (index: number) => {
    setSaveError(null);
    setLimitReached(false);
    setStepIndex(index);
    Animated.timing(position, {
      toValue: index,
      duration: motion.duration.base,
      easing: Easing.bezier(...motion.easing.standard),
      useNativeDriver: true,
    }).start();
  };

  const goBack = () => {
    if (stepIndex > 0 && !saving) goTo(stepIndex - 1);
  };

  const goNext = async () => {
    if (saving || !canContinue(step, answers)) return;

    const changes: ProfileUpdate | null =
      step === 'ready'
        ? { onboarding_completed_at: new Date().toISOString() }
        : changesForStep(step, answers, profile);

    if (changes) {
      setSaving(true);
      setSaveError(null);
      const result = await updateProfile(changes);
      setSaving(false);
      if (!result.ok) {
        setSaveError(copy.onboarding.saveError);
        return;
      }
    }

    if (step !== 'ready') {
      goTo(stepIndex + 1);
      return;
    }
    // Finishing flips the root layout's guard, which swaps onboarding for the
    // tabs; the camera then opens on top of them.
    router.push('/scan/capture');
  };

  const answer = (changes: Partial<OnboardingAnswers>) => {
    setAnswers((current) => ({ ...current, ...changes }));
    setSaveError(null);
  };

  const toggleConcern = (concern: Concern) => {
    const { concerns } = answers;
    if (concerns.includes(concern)) {
      answer({ concerns: concerns.filter((item) => item !== concern) });
      setLimitReached(false);
    } else if (concerns.length >= MAX_CONCERNS) {
      setLimitReached(true);
    } else {
      answer({ concerns: [...concerns, concern] });
    }
  };

  // The gesture and back-button handlers are created once, so they read the
  // current step through this ref.
  const latest = useRef({ step, stepIndex, goNext, goBack });
  useLayoutEffect(() => {
    latest.current = { step, stepIndex, goNext, goBack };
  });

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (latest.current.stepIndex === 0) return false;
        latest.current.goBack();
        return true;
      });
      return () => subscription.remove();
    }, []),
  );

  // PanResponder (not bare touch events) so that a swipe takes the touch away
  // from an option row, rather than also counting as a tap on it.
  // eslint-disable-next-line react-hooks/refs -- `latest` is read only inside gesture callbacks, never during render
  const [panResponder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > motion.swipe.activation &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2,
      onPanResponderRelease: (_event, gesture) => {
        const forward =
          gesture.dx <= -motion.swipe.distance || gesture.vx <= -motion.swipe.velocity;
        const backward = gesture.dx >= motion.swipe.distance || gesture.vx >= motion.swipe.velocity;
        // Finishing onboarding is a deliberate tap, never a swipe.
        if (forward && latest.current.step !== 'ready') void latest.current.goNext();
        else if (backward) latest.current.goBack();
      },
    }),
  );

  const renderStep = (id: OnboardingStep) => {
    switch (id) {
      case 'welcome':
        return <WelcomeStep />;
      case 'ageBand':
        return <AgeBandStep value={answers.ageBand} onChange={(ageBand) => answer({ ageBand })} />;
      case 'skinType':
        return (
          <SkinTypeStep value={answers.skinType} onChange={(skinType) => answer({ skinType })} />
        );
      case 'concerns':
        return (
          <ConcernsStep
            value={answers.concerns}
            onToggle={toggleConcern}
            limitReached={limitReached}
          />
        );
      case 'goal':
        return <GoalStep value={answers.goal} onChange={(goal) => answer({ goal })} />;
      case 'ready':
        return <ReadyStep answers={answers} />;
    }
  };

  return (
    <Screen padded={false}>
      <OnboardingHeader stepIndex={stepIndex} onBack={goBack} backDisabled={saving} />

      <View style={styles.viewport} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.track,
            { width: width * ONBOARDING_STEPS.length, transform: [{ translateX }] },
          ]}
        >
          {ONBOARDING_STEPS.map((id, index) => {
            const current = index === stepIndex;
            return (
              <View
                key={id}
                style={{ width, pointerEvents: current && !saving ? 'auto' : 'none' }}
                accessibilityElementsHidden={!current}
                importantForAccessibility={current ? 'auto' : 'no-hide-descendants'}
              >
                {renderStep(id)}
              </View>
            );
          })}
        </Animated.View>
      </View>

      <View style={styles.footer}>
        {saveError ? (
          <Text variant="bodySmall" color="danger" align="center" accessibilityLiveRegion="polite">
            {saveError}
          </Text>
        ) : null}
        <Button
          label={primaryLabel(step)}
          onPress={() => void goNext()}
          disabled={!canContinue(step, answers)}
          loading={saving}
          fullWidth
          size="lg"
        />
        {step === 'welcome' ? (
          <Button
            label={copy.onboarding.welcome.signIn}
            onPress={() => router.push('/sign-in')}
            variant="ghost"
            fullWidth
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    overflow: 'hidden',
  },
  track: {
    flex: 1,
    flexDirection: 'row',
  },
  footer: {
    gap: spacing.sm,
    padding: spacing.md,
  },
});
