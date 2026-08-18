/**
 * GAME-PHASE.JS
 * Tracks whether we're in the Placement or Combat phase, and updates the
 * small HUD text elements that reflect phase/wave status.
 */

import { GamePhase } from "./config.js";
import { state } from "./state.js";
import { cancelTowerInteraction } from "./input.js";
import { getNextWaveConfig, canStartWave } from "./wave-manager.js";

export function isPlacementPhase() {
  return state.phase === GamePhase.PLACEMENT;
}

export function isCombatPhase() {
  return state.phase === GamePhase.COMBAT;
}

export function setGamePhase(phase) {
  state.phase = phase;

  if (isCombatPhase()) {
    cancelTowerInteraction();
  }

  updatePhaseUI();
  updateWaveUI();
}

export function updatePhaseUI() {
  const indicator = document.getElementById("phase-indicator");
  const towerBar = document.getElementById("tower-bar");

  if (isCombatPhase()) {
    indicator.textContent = "Phase: Combat";
    indicator.classList.add("combat");
    towerBar.classList.add("disabled");
  } else {
    indicator.textContent = "Phase: Placement";
    indicator.classList.remove("combat");
    towerBar.classList.remove("disabled");
  }
}

export function updateWaveUI() {
  const btn = document.getElementById("wave-btn");
  const indicator = document.getElementById("wave-indicator");
  const wave = state.wave;
  const nextWave = getNextWaveConfig();

  if (wave.active) {
    btn.textContent = `Wave ${wave.currentWaveNumber}…`;
    btn.disabled = true;
    btn.classList.add("wave-active");
    indicator.textContent = `Wave: ${wave.currentWaveNumber}`;
    indicator.classList.add("active");
    return;
  }

  btn.classList.remove("wave-active");

  if (nextWave) {
    btn.textContent = `Send Wave ${nextWave.number} (F1)`;
    btn.disabled = !canStartWave();
    indicator.textContent = `Next: Wave ${nextWave.number} (MV ${nextWave.monsterValue})`;
  } else {
    btn.textContent = "All Waves Complete";
    btn.disabled = true;
    indicator.textContent = "Wave: Complete";
  }

  indicator.classList.remove("active");
}
