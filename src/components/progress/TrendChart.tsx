import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Circle, ClipPath, Defs, Line, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui';
import { SCORE_NOISE_POINTS } from '@/constants/progress';
import { monotoneBandPath, monotonePath, nearestIndex, scoreToY, timeToX } from '@/lib/chart';
import { chart, sizes, typography, useColors } from '@/theme/tokens';

export interface TrendPoint {
  /** Milliseconds since the epoch. */
  time: number;
  /** 0-100. */
  value: number;
}

export interface TrendChartProps {
  /** Oldest first. Needs at least two to draw a line. */
  points: TrendPoint[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  /** Dates for the first and last point, already formatted. */
  firstLabel: string;
  lastLabel: string;
  /** What the chart shows, for screen readers. */
  accessibilityLabel: string;
  /** The selected point in words, for screen readers. */
  selectedDescription: string;
  accessibilityHint: string;
}

/**
 * Score over time on an honest 0-100 axis. Dates are spaced by real time, so
 * irregular gaps look irregular. The line is smoothed without overshooting
 * any scan, every scan is a point, and the band either side of the line is
 * normal photo-to-photo variation. Tap anywhere to select the nearest scan;
 * with a screen reader, swipe up or down.
 */
export function TrendChart({
  points,
  selectedIndex,
  onSelect,
  firstLabel,
  lastLabel,
  accessibilityLabel,
  selectedDescription,
  accessibilityHint,
}: TrendChartProps) {
  const palette = useColors();
  const [width, setWidth] = useState(0);

  const left = chart.yLabelWidth + chart.inset;
  const right = width - chart.inset;
  const top = chart.inset;
  const bottom = chart.height - chart.inset;

  const xs = timeToX(
    points.map((point) => point.time),
    left,
    right,
  );
  const plotted = points.map((point, index) => ({
    x: xs[index],
    y: scoreToY(point.value, top, bottom),
  }));
  const noise = (SCORE_NOISE_POINTS / 100) * (bottom - top);
  const selected = plotted[selectedIndex];

  const handleLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const handlePress = (event: GestureResponderEvent) => {
    onSelect(nearestIndex(xs, event.nativeEvent.locationX));
  };

  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'increment') {
      onSelect(Math.min(points.length - 1, selectedIndex + 1));
    } else if (event.nativeEvent.actionName === 'decrement') {
      onSelect(Math.max(0, selectedIndex - 1));
    }
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: selectedDescription }}
      accessibilityHint={accessibilityHint}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={handleAccessibilityAction}
    >
      <View style={styles.plot} onLayout={handleLayout}>
        {width > 0 ? (
          <Pressable
            onPress={handlePress}
            accessibilityLabel={accessibilityLabel}
            style={StyleSheet.absoluteFill}
          >
            <Svg width={width} height={chart.height}>
              <Defs>
                <ClipPath id="trend-plot">
                  <Rect x={left} y={top} width={right - left} height={bottom - top} />
                </ClipPath>
              </Defs>

              {chart.gridScores.map((score) => {
                const y = scoreToY(score, top, bottom);
                return (
                  <Line
                    key={score}
                    x1={left}
                    x2={right}
                    y1={y}
                    y2={y}
                    stroke={palette.borderSubtle}
                    strokeWidth={sizes.borderWidth}
                  />
                );
              })}

              <Path
                d={monotoneBandPath(plotted, noise)}
                fill={palette.accent}
                fillOpacity={chart.bandOpacity}
                clipPath="url(#trend-plot)"
              />

              {selected ? (
                <Line
                  x1={selected.x}
                  x2={selected.x}
                  y1={top}
                  y2={bottom}
                  stroke={palette.border}
                  strokeWidth={sizes.borderWidth}
                />
              ) : null}

              <Path
                d={monotonePath(plotted)}
                stroke={palette.accent}
                strokeWidth={chart.lineWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />

              {plotted.map((point, index) => (
                <Circle
                  // Scans can share a time, so the index keeps keys unique.
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r={index === selectedIndex ? chart.selectedRadius : chart.pointRadius}
                  fill={palette.accent}
                  stroke={palette.surfaceElevated}
                  strokeWidth={chart.pointRing}
                />
              ))}
            </Svg>
          </Pressable>
        ) : null}

        {/* The y axis labels, level with their gridlines. */}
        {chart.gridScores.map((score) => (
          <Text
            key={score}
            variant="caption"
            color="textTertiary"
            align="right"
            style={[
              styles.yLabel,
              { top: scoreToY(score, top, bottom) - typography.caption.lineHeight / 2 },
            ]}
          >
            {score}
          </Text>
        ))}
      </View>

      <View style={[styles.xAxis, { paddingLeft: left - chart.inset }]}>
        <Text variant="caption" color="textSecondary">
          {firstLabel}
        </Text>
        {lastLabel !== firstLabel ? (
          <Text variant="caption" color="textSecondary">
            {lastLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: {
    height: chart.height,
  },
  yLabel: {
    position: 'absolute',
    left: 0,
    width: chart.yLabelWidth,
  },
  xAxis: {
    height: chart.axisBand,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
});
