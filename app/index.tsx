import { StyleSheet, View } from 'react-native';

/**
 * Placeholder entry route so the scaffold runs on device.
 * Replaced once the design system and onboarding flow exist.
 */
export default function Index() {
  return <View style={styles.screen} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
