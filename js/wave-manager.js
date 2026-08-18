/**
 * WAVE-MANAGER.JS
 * Turns a CONFIG.WAVES entry into a timed spawn queue, tracks wave progress,
 * and hands control back to Placement phase once all wave enemies are gone.
 */

import { CONFIG, GamePhase } from "./config.js";
import { state } from "./state.js";
import { getActiveSpawnPoints, spawnEnemyFromSpawn } from "./spawning.js";
import { isPlacementPhase, setGamePhase, updateWaveUI, updatePhaseUI } from "./game-phase.js";

/** @returns {object|null} Next wave config, or null if all waves are done. */
export function getNextWaveConfig() {
  const { nextWaveIndex } = state.wave;
  return CONFIG.WAVES[nextWaveIndex] ?? null;
}

/** Build a timed spawn queue from a wave definition. */
export function buildWaveSpawnQueue(waveConfig) {
  const spawns = getActiveSpawnPoints();
  const queue = [];
  let spawnSlot = 0;

  for (const group of waveConfig.groups) {
    for (let i = 0; i < group.count; i++) {
      queue.push({
        typeId: group.type,
        spawnSlot: spawnSlot % spawns.length,
        delay: group.spawnInterval,
      });
      spawnSlot++;
    }
  }

  return queue;
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
    getNextWaveConfig() !== null
  );
}

/** Start the next wave — enters combat and begins spawning. */
export function startNextWave() {
  if (!canStartWave()) return false;

  const waveConfig = getNextWaveConfig();
  const wave = state.wave;

  wave.active = true;
  wave.currentWaveNumber = waveConfig.number;
  wave.spawnQueue = buildWaveSpawnQueue(waveConfig);
  wave.spawnCooldown = 0;
  wave.spawningComplete = wave.spawnQueue.length === 0;

  // Spawn the first enemy immediately, then use intervals for the rest
  if (wave.spawnQueue.length > 0) {
    const first = wave.spawnQueue.shift();
    spawnEnemyFromSpawn(first.spawnSlot, first.typeId, true);
    wave.spawnCooldown = first.delay;
  }

  setGamePhase(GamePhase.COMBAT);
  updateWaveUI();
  updatePhaseUI();

  console.log(
    `Wave ${waveConfig.number} started — Monster Value: ${waveConfig.monsterValue} (actual: ${calculateWaveMonsterValue(waveConfig)})`
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

  wave.active = false;
  wave.currentWaveNumber = 0;
  wave.spawnQueue = [];
  wave.spawningComplete = false;
  wave.nextWaveIndex++;

  setGamePhase(GamePhase.PLACEMENT);
  updateWaveUI();
  updatePhaseUI();
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
