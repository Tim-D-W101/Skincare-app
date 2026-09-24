/**
 * Capture settings and the thresholds behind the camera guidance. These are
 * starting values: tune them on real phones, in real rooms.
 */

/** Longest edge of the photo that gets uploaded. */
export const PHOTO_LONG_EDGE = 1024;
/** JPEG quality of the uploaded photo (0-1). */
export const PHOTO_JPEG_QUALITY = 0.85;

/**
 * Preferred long edge of the camera's capture size. Large enough for a sharp
 * full-screen preview and the 1024px photo; small enough that the brightness
 * samples stay quick.
 */
export const CAPTURE_LONG_EDGE = 1920;

/** Pause between brightness samples, so checks run roughly 2-3 times a second. */
export const LIGHT_SAMPLE_INTERVAL_MS = 350;
/** Weight of each new sample in the running average (0-1). Higher reacts faster. */
export const LIGHT_SMOOTHING = 0.5;
/** Consecutive failed samples before the light check gives up for this visit. */
export const LIGHT_MAX_FAILURES = 5;

/**
 * Mean brightness (0-255) of the face area. Outside this range the guidance
 * asks for different light. `LIGHT_HYSTERESIS` stops the message flickering
 * when a reading sits right on a limit.
 */
export const LIGHT_TOO_DARK = 70;
export const LIGHT_TOO_BRIGHT = 205;
export const LIGHT_HYSTERESIS = 8;

/** Accelerometer update interval. */
export const MOTION_INTERVAL_MS = 100;
/** Weight of each new reading in the running movement figure sent as capture_quality. */
export const MOTION_SMOOTHING = 0.3;
/** Change in acceleration between readings, in g, that counts as moving. */
export const MOTION_THRESHOLD = 0.05;
/** How long the phone must stay still before it counts as steady. */
export const STEADY_AFTER_MS = 700;

/** Lifetime of the signed URL for the previous scan photo (the ghost overlay). */
export const GHOST_URL_TTL_SECONDS = 120;
