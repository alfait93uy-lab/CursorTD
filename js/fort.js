/**
 * FORT.JS
 * Fort HP tracking. Enemies that reach the Fort call damageFort(); the wave
 * manager calls healFortForWave() at the start of each wave.
 */

import { CONFIG } from "./config.js";
import { state } from "./state.js";

export function isFortDestroyed() {
  return state.fort.destroyed;
}

/** Apply damage to the Fort, updating the HUD and triggering Game Over at 0 HP. */
export function damageFort(amount) {
  if (state.fort.destroyed || amount <= 0) return;

  state.fort.hp = Math.max(0, state.fort.hp - amount);
  updateFortUI();

  if (state.fort.hp <= 0) {
    state.fort.destroyed = true;
    showGameOver();
  }
}

/** Heal the Fort by CONFIG.FORT_WAVE_REGEN, capped at max HP. Called at wave start. */
export function healFortForWave() {
  if (state.fort.destroyed) return;
  state.fort.hp = Math.min(state.fort.maxHp, state.fort.hp + CONFIG.FORT_WAVE_REGEN);
  updateFortUI();
}

/** Update the Fort HP HUD text. */
export function updateFortUI() {
  const display = document.getElementById("fort-hp-display");
  if (display) {
    display.textContent = `Fort: ${state.fort.hp}/${state.fort.maxHp}`;
    display.classList.toggle("low", state.fort.hp <= state.fort.maxHp * 0.3);
  }
}

export function showGameOver() {
  const panel = document.getElementById("game-over-panel");
  if (panel) {
    panel.classList.remove("hidden");
    panel.setAttribute("aria-hidden", "false");
  }
}

/** Hide the Game Over overlay (used by Re-play Wave). */
export function hideGameOver() {
  const panel = document.getElementById("game-over-panel");
  if (panel) {
    panel.classList.add("hidden");
    panel.setAttribute("aria-hidden", "true");
  }
}
