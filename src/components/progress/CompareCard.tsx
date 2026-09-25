import { Image, StyleSheet, View } from 'react-native';

import { CardHeader, CardText } from '@/components/scan/ShareCard';
import { copy } from '@/constants/copy';
import { ATTRIBUTE_KEYS } from '@/constants/scan';
import { SHARE_FORMATS } from '@/constants/share';
import { calendarDaysBetween, formatShortDate } from '@/lib/dates';
import { shareCard } from '@/theme/tokens';
import type { ScanResult } from '@/types/scan';

export interface CompareCardProps {
  /** The width it's drawn at, in dp. Everything on the card scales with it. */
  width: number;
  before: ScanResult;
  after: ScanResult;
  /** Links to both photos, or null to leave faces off, which is the default. */
  photos: { before: string; after: string } | null;
  onPhotoLoad?: () => void;
  onPhotoError?: () => void;
}

function describeChange(delta: number): string {
  if (delta > 0) return copy.results.change.up(delta);
  if (delta < 0) return copy.results.change.down(-delta);
  return copy.results.change.same;
}

/**
 * The before-and-after image, in story size: both overall scores, every
 * attribute as "before → after", the dates and the time between. The two
 * photos are only on it when `photos` is given.
 */
export function CompareCard({
  width,
  before,
  after,
  photos,
  onPhotoLoad,
  onPhotoError,
}: CompareCardProps) {
  const unit = width / shareCard.width;
  const exported = SHARE_FORMATS.story;
  const height = width * (exported.height / exported.width);
  const layout = shareCard.compare;
  const [earlier, later] = before.createdAt <= after.createdAt ? [before, after] : [after, before];
  const days = calendarDaysBetween(earlier.createdAt, later.createdAt);
  const photoStyle = {
    width: layout.photo.width * unit,
    height: layout.photo.height * unit,
    borderRadius: shareCard.photo.radius * unit,
  };

  return (
    <View style={[styles.card, { width, height, padding: shareCard.padding * unit }]}>
      <CardHeader
        unit={unit}
        detail={copy.progress.compare.cardDates(
          formatShortDate(before.createdAt),
          formatShortDate(after.createdAt),
        )}
      />

      <View style={[styles.middle, { gap: layout.gap * unit }]}>
        <View style={styles.centered}>
          <CardText unit={unit} size={layout.type.title} bold>
            {copy.progress.compare.title}
          </CardText>
        </View>

        {photos ? (
          <View style={[styles.photos, { gap: layout.photoGap * unit }]}>
            {(
              [
                [photos.before, copy.progress.compare.before],
                [photos.after, copy.progress.compare.after],
              ] as const
            ).map(([uri, label]) => (
              <View key={label} style={styles.centered}>
                <Image
                  source={{ uri }}
                  style={photoStyle}
                  resizeMode="cover"
                  // No fade-in, so an image captured right after loading isn't half transparent.
                  fadeDuration={0}
                  onLoad={onPhotoLoad}
                  onError={onPhotoError}
                />
                <CardText unit={unit} size={layout.type.label} muted>
                  {label}
                </CardText>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.centered}>
          <CardText unit={unit} size={layout.type.overall} bold>
            {copy.share.cardScoreChange(before.overall, after.overall)}
          </CardText>
          <CardText unit={unit} size={shareCard.type.changeNote} muted>
            {copy.share.cardChangeNote(
              describeChange(after.overall - before.overall),
              copy.progress.compare.elapsed(days),
            )}
          </CardText>
        </View>

        <View style={[styles.grid, { rowGap: layout.rowGap * unit }]}>
          {ATTRIBUTE_KEYS.map((key) => (
            <View key={key} style={[styles.cell, { paddingRight: layout.rowGap * unit }]}>
              <CardText unit={unit} size={layout.type.label} muted singleLine>
                {copy.results.attributes[key]}
              </CardText>
              <CardText unit={unit} size={layout.type.value} bold singleLine>
                {copy.share.cardScoreChange(before.scores[key], after.scores[key])}
              </CardText>
            </View>
          ))}
        </View>
      </View>

      <CardText unit={unit} size={shareCard.type.footer} muted>
        {copy.disclaimers.short}
      </CardText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: shareCard.colors.background,
    justifyContent: 'space-between',
  },
  middle: {
    flex: 1,
    justifyContent: 'center',
  },
  centered: {
    alignItems: 'center',
  },
  photos: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '50%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
});
