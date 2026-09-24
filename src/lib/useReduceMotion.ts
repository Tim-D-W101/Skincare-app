import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { logInDevelopment } from '@/lib/errors';

/** True when the user has asked the system to reduce motion. Follows changes live. */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch((error: unknown) => {
        // Motion stays on, which is the system default.
        logInDevelopment('Could not read the reduce motion setting', error);
      });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
