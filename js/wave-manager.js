/**
 * WAVE-MANAGER.JS
 * Owns wave LIFECYCLE only: starting a wave, ticking its spawn queue each
 * frame, and detecting when it's complete. The actual "who spawns when"
 * logic lives in wave-spawn-builder.js — this file just consumes the queue
 * that builds.
 */

import { CONFIG, GamePhase } from "./config.js";
import { state } from "./state.js";
import { spawnEnemyFromSpawn } from "./spawning.js";
import { buildWaveSpawnQueue } from "./wave-spawn-builder.js";
import { isPlacementPhase, setGamePhase, updateWaveUI, updatePhaseUI } from "./game-phase.js";
import { healFortForWave, isFortDestroyed, updateFortUI, hideGameOver } from "./fort.js";
import { recordWaveComplete } from "./progress.js";
import { allSpawnsCanReachFort } from "./pathfinding.js";
import { updateXpUI } from "./skill-tree.js";

/** @returns {object|null} Next wave config, or null if all waves are done. */
export function getNextWaveConfig() {
  const { nextWaveIndex } = state.wave;
  return CONFIG.WAVES[nextWaveIndex] ?? null;
}

/** Calculate total Monster Value for a wave (for display / validation). */
export function calculateWaveMonsterValue(waveConfig) {
  return waveConfig.groups.reduce((total, group) => {
    const typeDef = CONFIG.ENEMY_TYPES[group.type];
    return total + typeDef.monsterValue * group.count;
  }, 0);
}

/** True if a new wave can be started. */
export function canStartWave() {
  return (
    isPlacementPhase() &&
    !state.wave.active &&
    !isFortDestroyed() &&
    getNextWaveConfig() !== null &&
    allSpawnsCanReachFort()
  );
}

/** Start the next wave — enters combat and begins spawning. */
export function startNextWave() {
  if (!canStartWave()) return false;

  const waveConfig = getNextWaveConfig();
  const wave = state.wave;

  healFortForWave();

  wave.active = true;
  wave.currentWaveNumber = waveConfig.number;
  wave.spawnQueue = buildWaveSpawnQueue(waveConfig);
  wave.spawnCooldown = 0;
  wave.spawningComplete = wave.spawnQueue.length === 0;

  // Snapshot for Re-play Wave: undoes everything from this point forward
  // (kill XP, any mid-wave talent spend, Fort damage taken) if things go badly.
  wave.canReplay = true;
  wave.fortHpSnapshot = state.fort.hp;
  wave.xpSnapshot = state.player.xp;

  // Spawn the first enemy immediately, then use queued delays for the rest
  if (wave.spawnQueue.length > 0) {
    const first = wave.spawnQueue.shift();
    spawnEnemyFromSpawn(first.spawnSlot, first.typeId, true);
    wave.spawnCooldown = first.delay;
  }

  setGamePhase(GamePhase.COMBAT);
  updateWaveUI();
  updatePhaseUI();

  console.log(
    `Wave ${waveConfig.number} started — Monster Value: ${waveConfig.monsterValue} (actual: ${calculateWaveMonsterValue(waveConfig)}), period: ${waveConfig.period}s, spawn points: ${waveConfig.activeSpawnPoints}`
  );

  return true;
}

/** @returns {number} Wave enemies still on the map (alive and not at fort). */
export function countActiveWaveEnemies() {
  return state.enemies.filter(
    (enemy) =>
      enemy.isWaveEnemy && enemy.isAlive() && !enemy.reachedFort
  ).length;
}

/** Called when all wave enemies are defeated. */
export function completeWave() {
  const wave = state.wave;
  console.log(`Wave ${wave.currentWaveNumber} complete!`);

  if (state.menu.activeMapId) {
    recordWaveComplete(state.menu.activeMapId, wave.currentWaveNumber);
  }

  wave.active = false;
  wave.currentWaveNumber = 0;
  wave.spawnQueue = [];
  wave.spawningComplete = false;
  wave.canReplay = false; // wave cleared — nothing left to replay until the next one starts
  wave.nextWaveIndex++;

  setGamePhase(GamePhase.PLACEMENT);
  updateWaveUI();
  updatePhaseUI();
}

/**
 * Re-play the current wave attempt: clears the battlefield, returns to
 * Placement, and undoes everything since this wave started — Fort damage
 * taken, XP earned from kills, and any talent points spent mid-wave.
 * Tower placements are untouched. No-op if no wave is currently replayable.
 */
export function replayWave() {
  const wave = state.wave;
  if (!wave.canReplay) return false;

  state.enemies = [];
  state.projectiles = [];

  wave.active = false;
  wave.currentWaveNumber = 0;
  wave.spawnQueue = [];
  wave.spawnCooldown = 0;
  wave.spawningComplete = false;

  state.player.xp = wave.xpSnapshot;
  state.fort.hp = wave.fortHpSnapshot;
  state.fort.destroyed = false;

  hideGameOver();
  setGamePhase(GamePhase.PLACEMENT);
  updateXpUI();
  updateFortUI();
  updateWaveUI();

  return true;
}

/** Process wave spawning and check for wave completion. */
export function updateWaveManager(dt) {
  const wave = state.wave;
  if (!wave.active) return;

  // Spawn enemies from the queue over time
  if (!wave.spawningComplete) {
    wave.spawnCooldown -= dt;

    if (wave.spawnCooldown <= 0 && wave.spawnQueue.length > 0) {
      const entry = wave.spawnQueue.shift();
      spawnEnemyFromSpawn(entry.spawnSlot, entry.typeId, true);
      wave.spawnCooldown = entry.delay;
    }

    if (wave.spawnQueue.length === 0) {
      wave.spawningComplete = true;
    }
  }

  // Wave cleared once all spawns are done and every wave enemy is gone
  if (wave.spawningComplete && countActiveWaveEnemies() === 0) {
    completeWave();
  }
}
