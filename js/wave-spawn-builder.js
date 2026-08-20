/**
 * WAVE-SPAWN-BUILDER.JS
 * Pure functions that turn a wave definition (a CONFIG.WAVES entry) into a
 * flat, timed spawn queue. Nothing here touches game state — everything is
 * computed straight from the wave config + how many spawn points are active.
 *
 * WAVE DATA SHAPE (see config.js CONFIG.WAVES):
 *   {
 *     number: 3,
 *     period: 5,             // seconds — total time window the wave spawns over
 *     activeSpawnPoints: 2,  // how many spawn points to cycle through this wave
 *     groups: [
 *       { type: "basic", count: 7 },                // 7 basics spread evenly across `period`
 *       { type: "scout", count: 5, packSize: 3 },    // spawns in packs of 3, packs spread across `period`
 *       { type: "tough", count: 2, interval: 1.5 },  // escape hatch: fixed 1.5s gap, ignores period
 *     ],
 *   }
 *
 * All groups in a wave are INTERLEAVED — merged together by spawn time — so a
 * wave of basics + scouts spawns a mixed blend of both, not all basics then
 * all scouts.
 */

import { getActiveSpawnPoints } from "./spawning.js";

const DEFAULT_PERIOD = 5;

/**
 * Compute absolute spawn times (seconds from wave start) for one group.
 *
 * Normal mode: the group's enemies are spawned in "packs" of `packSize`
 * (default 1, i.e. one at a time). Packs are spaced evenly across the
 * group's period so the group finishes spawning right as the period ends.
 * Members of the same pack share a spawn time (they go out together, on
 * different spawn points).
 *
 * Escape hatch: if `group.interval` is set, that overrides period/packSize
 * entirely — enemies spawn one at a time at that fixed interval.
 */
function computeGroupSpawnTimes(group, wavePeriod) {
  const times = [];

  if (group.interval != null) {
    for (let i = 0; i < group.count; i++) {
      times.push(i * group.interval);
    }
    return times;
  }

  const period = group.period ?? wavePeriod ?? DEFAULT_PERIOD;
  const packSize = group.packSize ?? 1;
  const numPacks = Math.ceil(group.count / packSize);
  const packInterval = numPacks > 1 ? period / numPacks : 0;

  for (let pack = 0; pack < numPacks; pack++) {
    const packStart = pack * packInterval;
    const enemiesInThisPack = Math.min(packSize, group.count - pack * packSize);
    for (let i = 0; i < enemiesInThisPack; i++) {
      times.push(packStart);
    }
  }

  return times;
}

/**
 * Merge every group's spawn times into one list of { typeId, time },
 * sorted by time. This is what makes mixed-type waves interleave instead
 * of playing one group after another.
 */
function buildInterleavedTimeline(waveConfig) {
  const entries = [];

  for (const group of waveConfig.groups) {
    const times = computeGroupSpawnTimes(group, waveConfig.period);
    for (const time of times) {
      entries.push({ typeId: group.type, time });
    }
  }

  // Array.sort is stable in modern JS, so same-time entries (e.g. pack
  // members) keep the order they were added in.
  entries.sort((a, b) => a.time - b.time);
  return entries;
}

/**
 * How many spawn points a wave should cycle through, clamped to how many
 * are actually configured. Defaults to "all of them" if the wave doesn't
 * specify a count.
 */
export function getWaveSpawnCount(waveConfig) {
  const configuredSpawns = getActiveSpawnPoints().length;
  const requested = waveConfig.activeSpawnPoints ?? configuredSpawns;
  return Math.max(1, Math.min(requested, configuredSpawns));
}

/**
 * Turn a wave definition into the timed spawn queue the wave manager
 * consumes: [{ typeId, spawnSlot, delay }, ...].
 * `delay` is the wait time AFTER this entry spawns, before the next one
 * fires — matching how updateWaveManager's cooldown timer is used.
 */
export function buildWaveSpawnQueue(waveConfig) {
  const timeline = buildInterleavedTimeline(waveConfig);
  const spawnCount = getWaveSpawnCount(waveConfig);

  const queue = timeline.map((entry, i) => ({
    typeId: entry.typeId,
    spawnSlot: i % spawnCount,
    delay: 0,
  }));

  for (let i = 0; i < queue.length - 1; i++) {
    queue[i].delay = Math.max(0, timeline[i + 1].time - timeline[i].time);
  }

  return queue;
}
