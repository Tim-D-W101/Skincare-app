import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';

import { faceOval } from '@/lib/capture';
import { camera, cameraColors } from '@/theme/tokens';

export interface FaceOvalProps {
  width: number;
  height: number;
  /** Outlines the oval in the accent colour once every check passes. */
  ready: boolean;
}

/** Dims the preview outside a face-shaped oval. Decorative: the guidance line carries the meaning. */
export function FaceOval({ width, height, ready }: FaceOvalProps) {
  const { cx, cy, rx, ry } = faceOval({ width, height });
  // The full rectangle plus the oval, filled even-odd, leaves the oval clear.
  const hole = `M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 0 ${rx * 2} 0 a ${rx} ${ry} 0 1 0 ${-rx * 2} 0 Z`;

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.passThrough]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={width} height={height}>
        <Path
          d={`M 0 0 H ${width} V ${height} H 0 Z ${hole}`}
          fill={cameraColors.scrim}
          fillRule="evenodd"
        />
        <Ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="none"
          stroke={ready ? cameraColors.ovalReady : cameraColors.ovalIdle}
          strokeWidth={camera.ovalStroke}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  passThrough: {
    pointerEvents: 'none',
  },
});
