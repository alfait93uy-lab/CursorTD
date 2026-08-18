/**
 * MAIN.JS — Entry point (loaded from index.html as type="module")
 *
 * Tower Defense — Phase 8: Real Tower Attack Behaviors
 * Wires up all the modules and runs the game loop. Game logic itself lives
 * in the other js/ files — this file should stay thin.
 */

import { CONFIG } from "./config.js";
import { canvas, state } from "./state.js";
import { setupInput } from "./input.js";
import { renderTowerBar, selectTowerType } from "./placement.js";
import { toggleSkillTree, closeSkillTree, updateXpUI } from "./skill-tree.js";
import { updatePhaseUI, updateWaveUI, isCombatPhase } from "./game-phase.js";
import { updateCamera, clampCamera } from "./camera.js";
import { updateWaveManager } from "./wave-manager.js";
import { render } from "./render.js";
import { updateFortUI, isFortDestroyed } from "./fort.js";

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
