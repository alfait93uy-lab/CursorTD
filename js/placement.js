/**
 * PLACEMENT.JS
 * Where towers are allowed to go, selecting a type from the bar, placing/
 * finding towers on the map, and the tower bar's DOM rendering.
 */

import { CONFIG, TILE } from "./config.js";
import { canvas, state } from "./state.js";
import { worldToTile } from "./coords.js";
import { isTileInBounds, getTile, isTerrainWalkable } from "./tilemap.js";
import { PATH_NEIGHBORS } from "./pathfinding.js";
import { Tower } from "./tower.js";
import { isTowerUnlocked } from "./skill-tree.js";
import { isPlacementPhase } from "./game-phase.js";
import { getActiveSpawnPoints } from "./spawning.js";

/** @returns {boolean} True if the tile is reserved for spawn or fort. */
export function isReservedTile(col, row) {
  if (col === CONFIG.FORT.col && row === CONFIG.FORT.row) return true;
  for (const spawn of getActiveSpawnPoints()) {
    if (spawn.col === col && spawn.row === row) return true;
  }
  return false;
}

/** @returns {Tower|null} Tower occupying a tile, if any. */
export function getTowerAtTile(col, row, ignoreTower = null) {
  for (const tower of state.towers.list) {
    if (tower === ignoreTower) continue;
    const tc = tower.getTileCoords();
    if (tc.col === col && tc.row === row) return tower;
  }
  return null;
}

/** True if any orthogonally adjacent tile is terrain-blocked (painted). */
export function isAdjacentToBlockedTile(col, row) {
  for (const [dc, dr] of PATH_NEIGHBORS) {
    const nc = col + dc;
    const nr = row + dr;
    if (isTileInBounds(nc, nr) && getTile(nc, nr) === TILE.BLOCKED) {
      return true;
    }
  }
  return false;
}

/**
 * Check whether a tower can be placed at a world position.
 * @param {number} x
 * @param {number} y
 * @param {string} typeId
 * @param {Tower|null} [ignoreTower] - Excluded tower (used when moving)
 */
export function canPlaceTower(x, y, typeId, ignoreTower = null) {
  if (!isTowerUnlocked(typeId)) return false;

  const { col, row } = worldToTile(x, y);

  if (!isTileInBounds(col, row)) return false;
  if (!isTerrainWalkable(col, row)) return false;
  if (isReservedTile(col, row)) return false;
  if (getTowerAtTile(col, row, ignoreTower)) return false;
  if (isAdjacentToBlockedTile(col, row)) return false;

  return true;
}

/** Place a new tower and add it to the list. */
export function placeTower(typeId, x, y) {
  state.towers.list.push(new Tower(typeId, x, y));
}

/** @returns {Tower|null} Topmost tower under the cursor, if any. */
export function getTowerAt(worldX, worldY) {
  for (let i = state.towers.list.length - 1; i >= 0; i--) {
    if (state.towers.list[i].containsPoint(worldX, worldY)) {
      return state.towers.list[i];
    }
  }
  return null;
}

/** Enter placement mode for a tower type from the bar. */
export function selectTowerType(typeId) {
  if (!isPlacementPhase()) return;
  if (!isTowerUnlocked(typeId)) return;

  if (state.towers.placementTypeId === typeId) {
    cancelTowerPlacement();
    return;
  }

  state.towers.placementTypeId = typeId;
  state.towers.selected = null;
  state.towers.drag = null;
  state.paint = null;
  updateTowerBarUI();
  updateCanvasCursor();
}

/** Leave placement mode. */
export function cancelTowerPlacement() {
  state.towers.placementTypeId = null;
  updateTowerBarUI();
  updateCanvasCursor();
}

/** Highlight the active tower button in the bar. */
export function updateTowerBarUI() {
  document.querySelectorAll(".tower-btn").forEach((btn) => {
    const typeId = btn.dataset.towerType;
    btn.classList.toggle("selected", typeId === state.towers.placementTypeId);
  });
}

/**
 * Rebuild the tower bar from unlocked tower types.
 * Called after a skill tree unlock.
 */
export function renderTowerBar() {
  const bar = document.getElementById("tower-bar");
  bar.innerHTML = "";

  const unlocked = [...state.player.unlockedTowers].sort();

  if (unlocked.length === 0) {
    bar.classList.add("empty");
    return;
  }

  bar.classList.remove("empty");

  for (const typeId of unlocked) {
    const def = CONFIG.TOWER_TYPES[typeId];
    if (!def) continue;

    const btn = document.createElement("button");
    btn.className = "tower-btn";
    btn.type = "button";
    btn.dataset.towerType = typeId;
    btn.title = `${def.label} — click to select, then place on map`;

    btn.innerHTML = `
      <span class="tower-btn-icon tower-icon-${typeId}"></span>
      <span class="tower-btn-label">${def.label}</span>
    `;

    if (typeId === state.towers.placementTypeId) {
      btn.classList.add("selected");
    }

    bar.appendChild(btn);
  }
}

/** Update canvas cursor class based on current interaction mode. */
export function updateCanvasCursor() {
  canvas.classList.remove("cursor-place", "cursor-move");
  if (state.towers.placementTypeId) {
    canvas.classList.add("cursor-place");
  } else if (state.towers.drag) {
    canvas.classList.add("cursor-move");
  }
}
