import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  Disclaimer,
  EmptyState,
  ErrorState,
  LoadingState,
  ScoreRing,
  Screen,
  Text,
  TextField,
  type ButtonSize,
  type ButtonVariant,
} from '@/components/ui';
import { copy } from '@/constants/copy';
import {
  sizes,
  spacing,
  typography,
  type ShadowLevel,
  type TypographyVariant,
} from '@/theme/tokens';

/**
 * Development-only screen that renders every UI primitive and variant, for
 * checking on device in light and dark mode. Delete this route before release.
 */

const gallery = copy.devGallery;

const BUTTON_VARIANTS: readonly ButtonVariant[] = ['primary', 'secondary', 'ghost', 'destructive'];
const BUTTON_SIZES: readonly ButtonSize[] = ['sm', 'md', 'lg'];
const CARD_ELEVATIONS: readonly (ShadowLevel | 'none')[] = ['none', 'sm', 'md', 'lg'];
const TEXT_VARIANTS = Object.keys(typography) as TypographyVariant[];
const SAMPLE_SCORES = [18, 44, 63, 81, 94] as const;
const MAX_CHIPS = 3;

function noop() {}

export default function DevGallery() {
  const [ringKey, setRingKey] = useState(0);
  const [selectedChips, setSelectedChips] = useState<readonly string[]>([gallery.chipOptions[0]]);

  const toggleChip = (option: string) => {
    setSelectedChips((current) => {
      if (current.includes(option)) return current.filter((item) => item !== option);
      if (current.length >= MAX_CHIPS) return current;
      return [...current, option];
    });
  };

  return (
    <Screen scroll contentStyle={styles.content}>
      <Text variant="h1" accessibilityRole="header">
        {gallery.title}
      </Text>
      <Text color="textSecondary">{gallery.intro}</Text>

      <Section title={gallery.sections.text}>
        {TEXT_VARIANTS.map((variant) => (
          <Text key={variant} variant={variant}>
            {`${variant}: ${gallery.textSample}`}
          </Text>
        ))}
        <Text color="textSecondary">{gallery.textSample}</Text>
        <Text color="textTertiary">{gallery.textSample}</Text>
        <Text color="accent">{gallery.textSample}</Text>
      </Section>

      <Section title={gallery.sections.buttons}>
        {BUTTON_VARIANTS.map((variant) => (
          <View key={variant} style={styles.row}>
            {BUTTON_SIZES.map((size) => (
              <Button
                key={size}
                label={gallery.buttons[variant]}
                variant={variant}
                size={size}
                onPress={noop}
              />
            ))}
          </View>
        ))}
        <View style={styles.row}>
          <Button label={gallery.buttons.withIcon} leadingIcon="plus" onPress={noop} />
          <Button label={gallery.buttons.loading} loading onPress={noop} />
          <Button label={gallery.buttons.disabled} disabled onPress={noop} />
        </View>
        <Button label={gallery.buttons.fullWidth} fullWidth size="lg" onPress={noop} />
      </Section>

      <Section title={gallery.sections.cards}>
        {CARD_ELEVATIONS.map((elevation) => (
          <Card key={elevation} elevation={elevation}>
            <Text variant="label">{elevation}</Text>
            <Text variant="bodySmall" color="textSecondary">
              {gallery.cardBody}
            </Text>
          </Card>
        ))}
      </Section>

      <Section title={gallery.sections.scoreRings}>
        <View style={styles.center}>
          <ScoreRing
            key={`hero-${ringKey}`}
            score={SAMPLE_SCORES[3]}
            size={sizes.scoreRing.lg}
            strokeWidth={sizes.scoreRingStroke.lg}
            label={gallery.ringLabels[4]}
          />
        </View>
        <View style={styles.row}>
          {SAMPLE_SCORES.map((score, index) => (
            <ScoreRing
              key={`${score}-${ringKey}`}
              score={score}
              size={sizes.scoreRing.sm}
              strokeWidth={sizes.scoreRingStroke.sm}
              label={gallery.ringLabels[index]}
            />
          ))}
        </View>
        <View style={styles.row}>
          <ScoreRing score={SAMPLE_SCORES[2]} animate={false} label={gallery.ringLabels[2]} />
        </View>
        <Button
          label={gallery.replay}
          variant="secondary"
          leadingIcon="refresh"
          onPress={() => setRingKey((key) => key + 1)}
        />
        <Disclaimer />
      </Section>

      <Section title={gallery.sections.chips}>
        <View style={styles.row}>
          {gallery.chipOptions.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={selectedChips.includes(option)}
              onPress={() => toggleChip(option)}
            />
          ))}
          <Chip label={gallery.buttons.disabled} selected={false} disabled onPress={noop} />
        </View>
        <Text variant="caption" color="textSecondary">
          {gallery.chipCounter(selectedChips.length, MAX_CHIPS)}
        </Text>
      </Section>

      <Section title={gallery.sections.emptyState}>
        <Card elevation="none">
          <EmptyState
            title={gallery.emptyTitle}
            body={gallery.emptyBody}
            action={{ label: gallery.emptyAction, onPress: noop }}
          />
        </Card>
      </Section>

      <Section title={gallery.sections.loadingState}>
        <Card elevation="none">
          <LoadingState />
        </Card>
        <Card elevation="none">
          <LoadingState variant="spinner" />
        </Card>
      </Section>

      <Section title={gallery.sections.errorState}>
        <Card elevation="none">
          <ErrorState message={copy.errors.generic} onRetry={noop} />
        </Card>
      </Section>

      <Section title={gallery.sections.disclaimer}>
        <Disclaimer variant="short" />
        <Disclaimer variant="full" />
      </Section>

      <Section title={gallery.sections.textField}>
        <TextField label={gallery.textFieldLabel} placeholder={gallery.textFieldPlaceholder} />
        <TextField
          label={gallery.textFieldLabel}
          placeholder={gallery.textFieldPlaceholder}
          error={gallery.textFieldError}
        />
      </Section>
    </Screen>
  );
}

interface SectionProps {
  title: string;
  children: ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text variant="h3" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  center: {
    alignItems: 'center',
  },
});
