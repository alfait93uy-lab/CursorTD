/**
 * SPAWNING.JS
 * Turns a spawn point + enemy type into a live Enemy on the map.
 */

import { CONFIG, GamePhase } from "./config.js";
import { state } from "./state.js";
import { findPath } from "./pathfinding.js";
import { Enemy } from "./enemy.js";
import { isPlacementPhase, setGamePhase } from "./game-phase.js";

export function getActiveSpawnPoints() {
  return CONFIG.SPAWN_POINTS.filter((spawn) => spawn !== null);
}

/**
 * Spawn an enemy from a spawn point along a path to the Fort.
 * @param {number} spawnSlot - Index into active spawn points
 * @param {string} typeId - Key in CONFIG.ENEMY_TYPES
 * @param {boolean} isWaveEnemy - Whether this enemy belongs to the current wave
 * @returns {Enemy|null}
 */
export function spawnEnemyFromSpawn(spawnSlot, typeId = "basic", isWaveEnemy = false) {
  const spawns = getActiveSpawnPoints();
  if (spawns.length === 0) {
    console.warn("No spawn points configured.");
    return null;
  }

  const spawn = spawns[spawnSlot % spawns.length];
  const { col: fortCol, row: fortRow } = CONFIG.FORT;

  const path = findPath(spawn.col, spawn.row, fortCol, fortRow);
  if (!path) {
    console.warn(
      `No path from spawn (${spawn.col}, ${spawn.row}) to fort (${fortCol}, ${fortRow}).`
    );
    return null;
  }

  const enemy = new Enemy(path, spawnSlot % spawns.length, {
    typeId,
    isWaveEnemy,
  });
  state.enemies.push(enemy);
  return enemy;
}

/** Manual test spawn — not part of a wave. Enters combat so towers can attack. */
export function spawnTestEnemy() {
  const spawnSlot = state.nextSpawnIndex;
  state.nextSpawnIndex++;

  const enemy = spawnEnemyFromSpawn(spawnSlot, "basic", false);
  if (!enemy) return;

  if (isPlacementPhase() && !state.wave.active) {
    setGamePhase(GamePhase.COMBAT);
  }
}
