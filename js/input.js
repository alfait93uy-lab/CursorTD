/**
 * INPUT.JS
 * All keyboard and mouse handling: camera keys, zoom wheel, tower
 * placement/selection/drag/rotate, and click-and-drag tile painting.
 */

import { CONFIG, TILE, GamePhase } from "./config.js";
import { canvas, state } from "./state.js";
import { screenToWorld, screenToTile, snapToTileCenter } from "./coords.js";
import {
  canPlaceTower,
  placeTower,
  getTowerAt,
  getTowerAtTile,
  updateCanvasCursor,
  cancelTowerPlacement,
} from "./placement.js";
import { isPlacementPhase } from "./game-phase.js";
import { isSkillTreeOpen, closeSkillTree, toggleSkillTree } from "./skill-tree.js";
import { startNextWave } from "./wave-manager.js";
import { spawnTestEnemy } from "./spawning.js";
import { setTile } from "./tilemap.js";
import { clamp } from "./utils.js";
import { clampCamera } from "./camera.js";

export function setupInput() {
  window.addEventListener("keydown", (e) => {
    // All game shortcuts (camera, skill tree, waves, spawning) only apply
    // once the player has actually entered a map from the Main Menu.
    if (state.menu.screen !== "game") return;

    if (e.key === "Escape") {
      if (isSkillTreeOpen()) {
        closeSkillTree();
      } else {
        cancelTowerInteraction();
      }
      e.preventDefault();
      return;
    }

    if (e.key === "k" || e.key === "K") {
      toggleSkillTree();
      e.preventDefault();
      return;
    }

    if (isSkillTreeOpen()) return;

    if (e.key === "F1") {
      startNextWave();
      e.preventDefault();
      return;
    }

    if (e.key === " " || e.code === "Space") {
      spawnTestEnemy();
      e.preventDefault();
      return;
    }

    const key = e.key.toLowerCase();
    if (key in state.keys) {
      state.keys[key] = true;
      e.preventDefault();
    }
  });

  window.addEventListener("keyup", (e) => {
    const key = e.key.toLowerCase();
    if (key in state.keys) {
      state.keys[key] = false;
    }
  });

  document.getElementById("spawn-btn").addEventListener("click", spawnTestEnemy);
  document.getElementById("wave-btn").addEventListener("click", startNextWave);

  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const direction = e.deltaY < 0 ? 1 : -1;
      state.camera.zoom = clamp(
        state.camera.zoom + direction * CONFIG.ZOOM_STEP,
        CONFIG.ZOOM_MIN,
        CONFIG.ZOOM_MAX
      );
      clampCamera();
    },
    { passive: false }
  );

  canvas.addEventListener("mousedown", onCanvasMouseDown);
  canvas.addEventListener("mousemove", onCanvasMouseMove);
  window.addEventListener("mousemove", onWindowMouseMove);
  window.addEventListener("mouseup", onWindowMouseUp);
  canvas.addEventListener("contextmenu", onCanvasContextMenu);
}

/** Cancel placement, selection, and in-progress tower drag. */
export function cancelTowerInteraction() {
  if (state.towers.drag) {
    const { tower, origX, origY } = state.towers.drag;
    tower.x = origX;
    tower.y = origY;
    state.towers.drag = null;
  }

  state.towers.rotateDrag = null;
  cancelTowerPlacement();
  state.towers.selected = null;
  state.paint = null;
  updateCanvasCursor();
}

function onCanvasContextMenu(e) {
  e.preventDefault();
}

function onCanvasMouseDown(e) {
  if (isSkillTreeOpen()) return;

  const world = screenToWorld(e.clientX, e.clientY);

  // --- Right click: cancel tower placement OR paint blocked tiles ---
  if (e.button === 2) {
    e.preventDefault();
    if (state.towers.placementTypeId) {
      cancelTowerPlacement();
      return;
    }
    if (!state.towers.drag && !isPointerOverUI(e)) {
      beginTilePaint(e, TILE.BLOCKED);
    }
    return;
  }

  if (e.button !== 0) return;

  // Ignore map interactions that start on UI overlays
  if (isPointerOverUI(e)) return;

  // --- Placement mode: left-click places on a valid tile, or cancels otherwise ---
  if (state.towers.placementTypeId && isPlacementPhase()) {
    const snapped = snapToTileCenter(world.x, world.y);

    if (canPlaceTower(snapped.x, snapped.y, state.towers.placementTypeId)) {
      placeTower(state.towers.placementTypeId, snapped.x, snapped.y);
    } else {
      // Clicking an invalid spot cancels placement — no longer forces the
      // player to right-click just to get rid of the tower stuck to their cursor.
      cancelTowerPlacement();
    }
    e.preventDefault();
    return;
  }

  // --- Drag the rotation handle of the currently selected directional tower ---
  const selectedTower = state.towers.selected;
  if (
    selectedTower &&
    isPlacementPhase() &&
    selectedTower.containsRotationHandle(world.x, world.y)
  ) {
    state.towers.rotateDrag = { tower: selectedTower };
    state.paint = null;
    e.preventDefault();
    return;
  }

  // --- Click on existing tower: select and begin drag (placement phase only) ---
  const tower = getTowerAt(world.x, world.y);
  if (tower && isPlacementPhase()) {
    state.towers.selected = tower;
    state.towers.drag = {
      tower,
      origX: tower.x,
      origY: tower.y,
    };
    state.paint = null;
    updateCanvasCursor();
    e.preventDefault();
    return;
  }

  // --- Empty map click: deselect tower and paint walkable tiles ---
  state.towers.selected = null;
  beginTilePaint(e, TILE.WALKABLE);
}

function onCanvasMouseMove(e) {
  updateTowerGhost(e.clientX, e.clientY);
}

function onWindowMouseMove(e) {
  updateTowerGhost(e.clientX, e.clientY);

  // Rotate the selected directional tower while dragging its handle
  if (state.towers.rotateDrag) {
    const world = screenToWorld(e.clientX, e.clientY);
    const tower = state.towers.rotateDrag.tower;
    tower.angle = Math.atan2(world.y - tower.y, world.x - tower.x);
    return;
  }

  // Move a placed tower while dragging (takes priority over tile painting)
  if (state.towers.drag) {
    state.paint = null;
    const world = screenToWorld(e.clientX, e.clientY);
    const snapped = snapToTileCenter(world.x, world.y);
    state.towers.drag.tower.x = snapped.x;
    state.towers.drag.tower.y = snapped.y;
    return;
  }

  // Skip tile painting while a tower type is selected from the bar
  if (state.towers.placementTypeId) return;

  // Tile painting (click and drag)
  if (!state.paint) return;

  const buttonMask = state.paint.tileState === TILE.WALKABLE ? 1 : 2;
  if (!(e.buttons & buttonMask)) {
    state.paint = null;
    return;
  }

  paintStrokeAt(e.clientX, e.clientY);
}

function onWindowMouseUp() {
  if (state.towers.rotateDrag) {
    state.towers.rotateDrag = null;
    return;
  }

  if (state.towers.drag) {
    const { tower, origX, origY } = state.towers.drag;

    if (!canPlaceTower(tower.x, tower.y, tower.typeId, tower)) {
      tower.x = origX;
      tower.y = origY;
    }

    state.towers.selected = tower;
    state.towers.drag = null;
    updateCanvasCursor();
    return;
  }

  state.paint = null;
}

/** Update ghost preview position while in placement mode. */
function updateTowerGhost(clientX, clientY) {
  if (!state.towers.placementTypeId) return;

  const world = screenToWorld(clientX, clientY);
  const snapped = snapToTileCenter(world.x, world.y);

  state.towers.ghost.x = snapped.x;
  state.towers.ghost.y = snapped.y;
  state.towers.ghost.valid = canPlaceTower(
    snapped.x,
    snapped.y,
    state.towers.placementTypeId
  );
}

/** True when the event target is a UI element outside the canvas. */
function isPointerOverUI(e) {
  return e.target !== canvas;
}

function beginTilePaint(e, tileState) {
  const { col, row } = screenToTile(e.clientX, e.clientY);
  if (getTowerAtTile(col, row)) return;
  state.paint = { tileState, lastCol: col, lastRow: row };
  setTile(col, row, tileState);
}

function paintStrokeAt(clientX, clientY) {
  const paint = state.paint;
  if (!paint) return;

  const { col, row } = screenToTile(clientX, clientY);
  if (col === paint.lastCol && row === paint.lastRow) return;

  paintLine(paint.lastCol, paint.lastRow, col, row, paint.tileState);
  paint.lastCol = col;
  paint.lastRow = row;
}

function paintLine(col0, row0, col1, row1, tileState) {
  let col = col0;
  let row = row0;

  const dx = Math.abs(col1 - col0);
  const dy = Math.abs(row1 - row0);
  const sx = col0 < col1 ? 1 : -1;
  const sy = row0 < row1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    // Only paint terrain — tower occupancy is tracked separately
    if (!getTowerAtTile(col, row)) {
      setTile(col, row, tileState);
    }
    if (col === col1 && row === row1) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      col += sx;
    }
    if (e2 < dx) {
      err += dx;
      row += sy;
    }
  }
}
