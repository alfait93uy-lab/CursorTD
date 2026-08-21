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
  wave.replayWaveIndex = wave.nextWaveIndex; // this wave's own slot — restored on replay even after a win advances nextWaveIndex
  wave.fortHpSnapshot = state.fort.hp;
  wave.xpSnapshot = state.player.xp;
  wave.xpEarnedThisWave = 0;

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
  const completedWaveNumber = wave.currentWaveNumber;
  const xpEarned = wave.xpEarnedThisWave;
  console.log(`Wave ${completedWaveNumber} complete!`);

  if (state.menu.activeMapId) {
    recordWaveComplete(state.menu.activeMapId, completedWaveNumber);
  }

  wave.active = false;
  wave.currentWaveNumber = 0;
  wave.spawnQueue = [];
  wave.spawningComplete = false;
  // canReplay stays true — the post-wave popup offers Re-play for the wave
  // just cleared, using the same snapshot/replayWaveIndex captured at its start.
  wave.nextWaveIndex++;

  setGamePhase(GamePhase.PLACEMENT);
  updateWaveUI();
  updatePhaseUI();
  showWaveCompletePanel(completedWaveNumber, xpEarned);
}

/**
 * Re-play the current wave attempt: clears the battlefield, returns to
 * Placement, and undoes everything since this wave started — Fort damage
 * taken, XP earned from kills, and any talent points spent mid-wave. Also
 * rewinds nextWaveIndex back to this wave if it had already been won.
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
  wave.nextWaveIndex = wave.replayWaveIndex;

  state.player.xp = wave.xpSnapshot;
  state.fort.hp = wave.fortHpSnapshot;
  state.fort.destroyed = false;

  hideGameOver();
  hideWaveCompletePanel();
  setGamePhase(GamePhase.PLACEMENT);
  updateXpUI();
  updateFortUI();
  updateWaveUI();

  return true;
}

/** Show the post-wave popup: XP earned, Re-play, or continue to Placement for the next wave. */
function showWaveCompletePanel(waveNumber, xpEarned) {
  const panel = document.getElementById("wave-complete-panel");
  if (!panel) return;

  const title = document.getElementById("wave-complete-title");
  const xpLine = document.getElementById("wave-complete-xp");
  if (title) title.textContent = `Wave ${waveNumber} Complete!`;
  if (xpLine) xpLine.textContent = `+${xpEarned} XP earned`;

  panel.classList.remove("hidden");
  panel.setAttribute("aria-hidden", "false");
}

/** Hide the post-wave popup. */
export function hideWaveCompletePanel() {
  const panel = document.getElementById("wave-complete-panel");
  if (panel) {
    panel.classList.add("hidden");
    panel.setAttribute("aria-hidden", "true");
  }
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
