import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Icon, Text } from '@/components/ui';
import { copy } from '@/constants/copy';
import { hapticImpact } from '@/lib/haptics';
import { tickKey } from '@/lib/routine';
import { opacity, radius, sizes, spacing, useColors } from '@/theme/tokens';
import type { RoutineSlot, RoutineStep } from '@/types/routine';

export interface RoutineSectionProps {
  slot: RoutineSlot;
  steps: RoutineStep[];
  ticked: Record<string, true>;
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleStep: (step: RoutineStep) => void;
}

/** Morning or evening: a header that opens and closes the section, and its steps to tick off. */
export function RoutineSection({
  slot,
  steps,
  ticked,
  expanded,
  onToggleExpanded,
  onToggleStep,
}: RoutineSectionProps) {
  const palette = useColors();
  const title = slot === 'morning' ? copy.routine.morning : copy.routine.evening;
  const done = steps.filter((step) => ticked[tickKey(step.slot, step.key)]).length;
  const count = copy.routine.sectionCount(done, steps.length);

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={onToggleExpanded}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${count}`}
        accessibilityState={{ expanded }}
        style={({ pressed }) => [styles.header, pressed ? styles.pressed : null]}
      >
        <Text variant="h3" accessibilityRole="header" style={styles.headerTitle}>
          {title}
        </Text>
        <Text variant="bodySmall" color="textSecondary">
          {count}
        </Text>
        <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={sizes.icon.md} />
      </Pressable>

      {expanded
        ? steps.map((step) => {
            const isDone = ticked[tickKey(step.slot, step.key)] === true;
            return (
              <Pressable
                key={step.key}
                onPress={() => {
                  if (!isDone) hapticImpact();
                  onToggleStep(step);
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isDone }}
                accessibilityLabel={step.title}
                accessibilityHint={step.why}
                style={({ pressed }) => [styles.step, pressed ? styles.pressed : null]}
              >
                <View
                  style={[
                    styles.box,
                    isDone
                      ? { backgroundColor: palette.accent, borderColor: palette.accent }
                      : { borderColor: palette.border },
                  ]}
                >
                  {isDone ? (
                    <Icon name="check" size={sizes.icon.sm} tint={palette.textInverse} />
                  ) : null}
                </View>
                <View style={styles.stepText}>
                  <Text variant="label" color={isDone ? 'textSecondary' : 'textPrimary'}>
                    {step.title}
                  </Text>
                  <Text variant="bodySmall" color="textSecondary">
                    {step.why}
                  </Text>
                </View>
              </Pressable>
            );
          })
        : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.minTouchTarget,
  },
  headerTitle: {
    flex: 1,
  },
  pressed: {
    opacity: opacity.pressed,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    minHeight: sizes.minTouchTarget,
    paddingVertical: spacing.sm,
  },
  box: {
    width: sizes.checkbox,
    height: sizes.checkbox,
    borderRadius: radius.sm,
    borderWidth: sizes.checkboxBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
    gap: spacing.xs,
  },
});
