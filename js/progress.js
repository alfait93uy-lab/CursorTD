/**
 * PROGRESS.JS
 * Tracks the highest wave reached per map and derives which maps are
 * unlocked. In-memory only for now (no save system yet — see Saves screen).
 */

import { CONFIG } from "./config.js";
import { state } from "./state.js";

/** @returns {{ highestWave: number }} */
export function getMapProgress(mapId) {
  return state.progress[mapId];
}

/**
 * A map is unlocked if it has no prerequisite, or its prerequisite map's
 * highest wave reached meets that map's full design wave count.
 */
export function isMapUnlocked(mapId) {
  const mapDef = CONFIG.MAPS.find((m) => m.id === mapId);
  if (!mapDef) return false;
  if (!mapDef.requiresMapId) return true;

  const requiredMapDef = CONFIG.MAPS.find((m) => m.id === mapDef.requiresMapId);
  const requiredProgress = getMapProgress(mapDef.requiresMapId);
  return requiredProgress.highestWave >= requiredMapDef.designWaveCount;
}

/** Called by the wave manager when a wave is cleared. */
export function recordWaveComplete(mapId, waveNumber) {
  const progress = state.progress[mapId];
  if (!progress) return;
  progress.highestWave = Math.max(progress.highestWave, waveNumber);
}
