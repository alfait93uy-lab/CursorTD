/**
 * MENU.JS
 * Main Menu screen navigation (Main / Play / Saves / How to Play), the map
 * select grid with unlock/progress state, the difficulty selector (UI only
 * for now — see DIFFICULTIES in config.js), and the static How to Play text.
 *
 * initMenu(onStartGame) wires everything up. onStartGame is called once,
 * the first time the player picks a map to play — main.js passes in the
 * function that actually boots the game loop, so this file never needs to
 * import main.js directly.
 */

import { CONFIG } from "./config.js";
import { state } from "./state.js";
import { isMapUnlocked, getMapProgress } from "./progress.js";

let startGameCallback = null;

export function initMenu(onStartGame) {
  startGameCallback = onStartGame;

  document.getElementById("menu-play-btn").addEventListener("click", () => showScreen("play"));
  document.getElementById("menu-saves-btn").addEventListener("click", () => showScreen("saves"));
  document.getElementById("menu-howto-btn").addEventListener("click", () => showScreen("howto"));

  document.getElementById("play-back-btn").addEventListener("click", () => showScreen("main"));
  document.getElementById("saves-back-btn").addEventListener("click", () => showScreen("main"));
  document.getElementById("howto-back-btn").addEventListener("click", () => showScreen("main"));

  renderDifficultySelect();
  renderHowToPlay();
  showScreen("main");
}

/** Switch the visible menu screen (does not affect the game screen). */
function showScreen(screenId) {
  state.menu.screen = screenId;

  document.querySelectorAll(".menu-screen").forEach((el) => {
    el.classList.toggle("hidden", el.id !== `screen-${screenId}`);
  });

  if (screenId === "play") {
    renderMapsGrid();
  }
}

function renderDifficultySelect() {
  const container = document.getElementById("difficulty-select");
  container.innerHTML = "";

  for (const diff of CONFIG.DIFFICULTIES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "difficulty-btn";
    btn.textContent = diff.label;
    btn.classList.toggle("selected", diff.id === state.menu.difficulty);
    btn.addEventListener("click", () => {
      state.menu.difficulty = diff.id;
      renderDifficultySelect();
    });
    container.appendChild(btn);
  }
}

function renderMapsGrid() {
  const grid = document.getElementById("maps-grid");
  grid.innerHTML = "";

  for (const mapDef of CONFIG.MAPS) {
    const unlocked = isMapUnlocked(mapDef.id);
    const progress = getMapProgress(mapDef.id);

    const card = document.createElement("button");
    card.type = "button";
    card.className = "map-card";
    card.disabled = !unlocked;

    if (unlocked) {
      card.innerHTML = `
        <span class="map-card-label">${mapDef.label}</span>
        <span class="map-card-progress">Wave ${progress.highestWave} / ${mapDef.designWaveCount}</span>
      `;
      card.addEventListener("click", () => startGame(mapDef.id));
    } else {
      const reqLabel = CONFIG.MAPS.find((m) => m.id === mapDef.requiresMapId)?.label ?? "";
      card.classList.add("locked");
      card.innerHTML = `
        <span class="map-card-label">${mapDef.label}</span>
        <span class="map-card-lock-icon">&#128274;</span>
        <span class="map-card-requirement">Complete ${reqLabel} to unlock</span>
      `;
    }

    grid.appendChild(card);
  }
}

/** Enter the game screen for a chosen map. */
function startGame(mapId) {
  state.menu.activeMapId = mapId;
  state.menu.screen = "game";

  document.getElementById("menu-root").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");

  if (startGameCallback) startGameCallback();
}

function renderHowToPlay() {
  const container = document.getElementById("howto-content");
  container.innerHTML = `
    <h3>Game Loop</h3>
    <p>Each map is played in rounds: during the <strong>Placement Phase</strong> you place and rearrange
    towers freely. Pressing <strong>Send Wave (F1)</strong> starts the <strong>Combat Phase</strong> —
    enemies spawn and your towers attack automatically. Once every enemy is gone, you return to
    Placement to prepare for the next wave.</p>

    <h3>Controls</h3>
    <ul>
      <li><strong>WASD</strong> — pan the camera</li>
      <li><strong>Mouse wheel</strong> — zoom in/out</li>
      <li><strong>Left click</strong> — place a selected tower, or select/drag a placed one</li>
      <li><strong>Right click</strong> — cancel placement</li>
      <li><strong>K</strong> — open the Skill Tree</li>
      <li><strong>F1</strong> — send the next wave</li>
      <li><strong>Space</strong> — spawn a test enemy (for trying out tower placement)</li>
    </ul>

    <h3>Towers</h3>
    <ul>
      <li><strong>Slayer</strong> — melee, wide cone attack in front of it</li>
      <li><strong>Spearman</strong> — melee, narrow directional attack, longer range</li>
      <li><strong>Striker</strong> — melee, circular area attack around itself</li>
      <li><strong>Marksman</strong> — ranged, targets whichever enemy is closest to the Fort</li>
    </ul>
    <p>Select a placed directional tower (Slayer/Spearman) and drag its handle to aim it.
    Unlock towers in the Skill Tree using XP earned from kills.</p>

    <h3>The Fort</h3>
    <p>Enemies that reach the Fort deal damage to it instead of dying. If the Fort's HP hits 0,
    the run ends. The Fort regenerates a small amount of HP at the start of each wave.</p>

    <h3>Difficulty</h3>
    <p>Normal, Hard, and Very Hard will affect the Fort's starting HP and enemy spawn behavior —
    this is planned but not active yet, so all difficulties currently play identically.</p>
  `;
}
