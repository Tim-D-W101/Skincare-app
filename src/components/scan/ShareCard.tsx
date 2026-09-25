import type { ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Icon, Text } from '@/components/ui';
import { copy } from '@/constants/copy';
import { ATTRIBUTE_KEYS } from '@/constants/scan';
import { SHARE_CARD_ATTRIBUTES, SHARE_FORMATS, type ShareFormat } from '@/constants/share';
import { calendarDaysBetween, formatShortDate } from '@/lib/dates';
import { fontFamilies, shareCard } from '@/theme/tokens';
import type { AttributeKey, ScanResult } from '@/types/scan';

export interface ShareCardProps {
  format: ShareFormat;
  /** The width it's drawn at, in dp. Everything on the card scales with it. */
  width: number;
  result: ScanResult;
  /** The scan before, for a before-and-after line. Null on a first scan. */
  previous: ScanResult | null;
  /** A local photo to include, or null to leave the face out, which is the default. */
  photoUri: string | null;
  onPhotoLoad?: () => void;
  onPhotoError?: () => void;
}

/** The highest attribute scores, best first. Ties keep the usual attribute order. */
function topAttributes(scores: Record<AttributeKey, number>): AttributeKey[] {
  return [...ATTRIBUTE_KEYS].sort((a, b) => scores[b] - scores[a]).slice(0, SHARE_CARD_ATTRIBUTES);
}

function describeChange(delta: number): string {
  if (delta > 0) return copy.results.change.up(delta);
  if (delta < 0) return copy.results.change.down(-delta);
  return copy.results.change.same;
}

/**
 * The shareable result image. Built to be read as a screenshot: the overall
 * score in a large ring, the top attribute scores, the date and, on a repeat
 * scan, before and after. Every number is written out, so nothing depends on
 * colour. The face photo is only on it when `photoUri` is given.
 */
export function ShareCard({
  format,
  width,
  result,
  previous,
  photoUri,
  onPhotoLoad,
  onPhotoError,
}: ShareCardProps) {
  const unit = width / shareCard.width;
  const exported = SHARE_FORMATS[format];
  const height = width * (exported.height / exported.width);
  const ringSize = (photoUri ? shareCard.ring.besidePhoto : shareCard.ring[format]) * unit;

  return (
    <View style={[styles.card, { width, height, padding: shareCard.padding * unit }]}>
      <View style={styles.header}>
        <View style={[styles.brand, { gap: shareCard.brandGap * unit }]}>
          <Icon name="sparkle" size={shareCard.brandIcon * unit} tint={shareCard.colors.text} />
          <CardText unit={unit} size={shareCard.type.brand} bold>
            {copy.share.cardBrand}
          </CardText>
        </View>
        <CardText unit={unit} size={shareCard.type.date} muted>
          {copy.share.cardDate(formatShortDate(result.createdAt))}
        </CardText>
      </View>

      <View style={[styles.middle, { gap: shareCard.gap[format] * unit }]}>
        <View style={[styles.hero, { gap: shareCard.heroGap * unit }]}>
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={{
                width: shareCard.photo.width * unit,
                height: shareCard.photo.height * unit,
                borderRadius: shareCard.photo.radius * unit,
              }}
              resizeMode="cover"
              // No fade-in, so an image captured right after loading isn't half transparent.
              fadeDuration={0}
              onLoad={onPhotoLoad}
              onError={onPhotoError}
            />
          ) : null}
          <CardRing score={result.overall} size={ringSize} unit={unit} />
        </View>

        {previous ? (
          <View style={styles.change}>
            <CardText unit={unit} size={shareCard.type.change} bold>
              {copy.share.cardScoreChange(previous.overall, result.overall)}
            </CardText>
            <CardText unit={unit} size={shareCard.type.changeNote} muted>
              {copy.share.cardChangeNote(
                describeChange(result.overall - previous.overall),
                copy.share.cardBeforeAfter(
                  calendarDaysBetween(previous.createdAt, result.createdAt),
                ),
              )}
            </CardText>
          </View>
        ) : null}

        <View style={[styles.tiles, { gap: shareCard.tileGap * unit }]}>
          {topAttributes(result.scores).map((key) => (
            <View
              key={key}
              style={[
                styles.tile,
                {
                  padding: shareCard.tilePadding * unit,
                  borderRadius: shareCard.tileRadius * unit,
                },
              ]}
            >
              <CardText unit={unit} size={shareCard.type.tileValue} bold>
                {result.scores[key]}
              </CardText>
              <CardText unit={unit} size={shareCard.type.tileLabel} muted singleLine>
                {copy.results.attributes[key]}
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

function CardRing({ score, size, unit }: { score: number; size: number; unit: number }) {
  const stroke = shareCard.ringStroke * unit;
  const center = size / 2;
  const ringRadius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const clamped = Math.min(100, Math.max(0, score));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={ringRadius}
          stroke={shareCard.colors.ringTrack}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={ringRadius}
          stroke={shareCard.colors.ring}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          fill="none"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.ringCenter]}>
        <CardText unit={1} size={size * shareCard.ringNumber} bold>
          {clamped}
        </CardText>
        <CardText unit={1} size={size * shareCard.ringLabel} muted>
          {copy.results.overall}
        </CardText>
      </View>
    </View>
  );
}

/**
 * Text at a fixed card size. It ignores the phone's font scale, because the
 * card is an image with a fixed layout.
 */
function CardText({
  children,
  unit,
  size,
  bold = false,
  muted = false,
  singleLine = false,
}: {
  children: ReactNode;
  unit: number;
  size: number;
  bold?: boolean;
  muted?: boolean;
  /** Keeps to one line, shrinking a little if it has to, so a long word can't break the layout. */
  singleLine?: boolean;
}) {
  return (
    <Text
      allowFontScaling={false}
      numberOfLines={singleLine ? 1 : undefined}
      adjustsFontSizeToFit={singleLine}
      style={{
        fontSize: size * unit,
        lineHeight: size * unit * shareCard.lineHeight,
        fontFamily: bold ? fontFamilies.bold : fontFamilies.regular,
        fontWeight: bold ? '700' : '400',
        color: muted ? shareCard.colors.textMuted : shareCard.colors.text,
      }}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: shareCard.colors.background,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  middle: {
    flex: 1,
    justifyContent: 'center',
  },
  hero: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  change: {
    alignItems: 'center',
  },
  tiles: {
    flexDirection: 'row',
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: shareCard.colors.tile,
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
