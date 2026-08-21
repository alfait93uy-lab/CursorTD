/**
 * MAIN.JS — Entry point (loaded from index.html as type="module")
 *
 * Tower Defense — Phase 9: Main Menu
 * Wires up all the modules. The game loop only starts once the player picks
 * a map from the Play screen (see menu.js) — before that, only the menu is
 * interactive.
 */

import { CONFIG } from "./config.js";
import { canvas, state } from "./state.js";
import { setupInput } from "./input.js";
import { renderTowerBar, selectTowerType } from "./placement.js";
import { toggleSkillTree, closeSkillTree, updateXpUI } from "./skill-tree.js";
import { updatePhaseUI, updateWaveUI, isCombatPhase } from "./game-phase.js";
import { updateCamera, clampCamera } from "./camera.js";
import { updateWaveManager, replayWave } from "./wave-manager.js";
import { render } from "./render.js";
import { updateFortUI, isFortDestroyed } from "./fort.js";
import { initMenu } from "./menu.js";

function init() {
  resizeCanvas();
  loadBackgroundImage();
  setupInput();
  setupTowerBar();
  setupSkillTree();
  updateXpUI();
  updateFortUI();
  renderTowerBar();
  updatePhaseUI();
  updateWaveUI();
  window.addEventListener("resize", onResize);
  document.getElementById("game-over-reload").addEventListener("click", () => {
    window.location.reload();
  });
  document.getElementById("game-over-replay").addEventListener("click", replayWave);
  document.getElementById("replay-wave-btn").addEventListener("click", replayWave);
  initMenu(startGameLoop);
}

let gameLoopStarted = false;

/** Passed to menu.js — called the first time a map is picked from Play. */
function startGameLoop() {
  if (gameLoopStarted) return;
  gameLoopStarted = true;
  requestAnimationFrame(gameLoop);
}

function onResize() {
  resizeCanvas();
  clampCamera();
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function loadBackgroundImage() {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    state.bgImage = img;
  };
  img.onerror = () => {
    console.warn("Background image failed to load — using solid color fallback.");
    state.bgImage = null;
  };
  img.src = CONFIG.BG_IMAGE_URL;
}

function setupTowerBar() {
  document.getElementById("tower-bar").addEventListener("click", (e) => {
    const btn = e.target.closest(".tower-btn");
    if (btn) selectTowerType(btn.dataset.towerType);
  });
}

function setupSkillTree() {
  document.getElementById("skill-tree-btn").addEventListener("click", toggleSkillTree);
  document.getElementById("skill-tree-close").addEventListener("click", closeSkillTree);
}

function gameLoop(timestamp) {
  // Defensive guard for when "quit to menu" exists in the future — right
  // now this is always true once the loop has started.
  if (state.menu.screen !== "game") {
    requestAnimationFrame(gameLoop);
    return;
  }

  const dt = state.lastFrameTime
    ? Math.min((timestamp - state.lastFrameTime) / 1000, 0.1)
    : 0;
  state.lastFrameTime = timestamp;

  updateCamera(dt);

  if (!isFortDestroyed()) {
    updateEnemies(dt);

    if (isCombatPhase()) {
      updateWaveManager(dt);
      updateTowers(dt);
      updateProjectiles(dt);
      cleanupCombatEntities();
    }
  }

  render();

  requestAnimationFrame(gameLoop);
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) {
    enemy.update(dt);
  }
}

function updateTowers(dt) {
  for (const tower of state.towers.list) {
    tower.update(dt);
  }
}

function updateProjectiles(dt) {
  for (const projectile of state.projectiles) {
    projectile.update(dt);
  }
}

/** Remove dead enemies and spent projectiles. */
function cleanupCombatEntities() {
  state.enemies = state.enemies.filter((enemy) => enemy.isAlive());
  state.projectiles = state.projectiles.filter((p) => p.alive);
}

init();
