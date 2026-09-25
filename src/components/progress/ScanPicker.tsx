import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Icon, Screen, Text } from '@/components/ui';
import { copy } from '@/constants/copy';
import { formatShortDate } from '@/lib/dates';
import type { ScanRecord } from '@/lib/progress';
import { opacity, radius, sizes, spacing, useColors } from '@/theme/tokens';

import { ScanPhoto } from './ScanPhoto';

export interface ScanPickerProps {
  /** "Before" or "After". */
  label: string;
  /** Title of the list that opens. */
  title: string;
  /** Oldest first. */
  records: ScanRecord[];
  selectedId: string;
  onSelect: (scanId: string) => void;
}

/** A field showing the chosen scan. Tapping it opens every scan to choose from. */
export function ScanPicker({ label, title, records, selectedId, onSelect }: ScanPickerProps) {
  const palette = useColors();
  const [open, setOpen] = useState(false);
  const selected = records.find((record) => record.result.scanId === selectedId);
  const selectedDate = selected ? formatShortDate(selected.result.createdAt) : '';

  const choose = (scanId: string) => {
    onSelect(scanId);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${selectedDate}`}
        accessibilityHint={title}
        style={({ pressed }) => [
          styles.field,
          { borderColor: palette.border, backgroundColor: palette.surface },
          pressed ? styles.pressed : null,
        ]}
      >
        <Text variant="caption" color="textSecondary">
          {label}
        </Text>
        <Text variant="label">{selectedDate}</Text>
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <Screen contentStyle={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text variant="h2" accessibilityRole="header" style={styles.sheetTitle}>
              {title}
            </Text>
            <Button
              label={copy.common.close}
              leadingIcon="close"
              onPress={() => setOpen(false)}
              variant="ghost"
              size="sm"
            />
          </View>
          <ScrollView contentContainerStyle={styles.list}>
            {[...records].reverse().map((record) => {
              const { result } = record;
              const isSelected = result.scanId === selectedId;
              const date = formatShortDate(result.createdAt);
              return (
                <Pressable
                  key={result.scanId}
                  onPress={() => choose(result.scanId)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={copy.progress.compare.pickerRow(date, result.overall)}
                  style={({ pressed }) => [
                    styles.row,
                    isSelected ? { backgroundColor: palette.accentSubtle } : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <ScanPhoto path={record.imagePath} style={styles.thumbnail} />
                  <View style={styles.rowText}>
                    <Text variant="label">{date}</Text>
                    <Text variant="bodySmall" color="textSecondary">
                      {copy.progress.compare.pickerScore(result.overall)}
                    </Text>
                  </View>
                  {isSelected ? <Icon name="check" size={sizes.icon.md} color="accent" /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Screen>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    minHeight: sizes.control.lg,
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: sizes.borderWidth,
  },
  pressed: {
    opacity: opacity.pressed,
  },
  sheet: {
    gap: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sheetTitle: {
    flex: 1,
  },
  list: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: sizes.minTouchTarget,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  thumbnail: {
    width: sizes.thumbnail.width,
    height: sizes.thumbnail.height,
    borderRadius: radius.sm,
  },
  rowText: {
    flex: 1,
    gap: spacing.xs,
  },
});
