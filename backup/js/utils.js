/**
 * UTILS.JS
 * Small generic helper functions with no game-specific dependencies.
 */

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
