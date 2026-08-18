/**
 * RENDER.JS
 * Everything drawn to the canvas each frame. render() is the entry point,
 * called once per frame from the game loop in main.js.
 *
 * drawRangeCircle / drawConeIndicator / drawRotationHandle are exported
 * because Tower.drawRange() (in tower.js) calls them directly.
 */

import { CONFIG, TILE } from "./config.js";
import { canvas, ctx, state } from "./state.js";
import { tileToWorldCenter } from "./coords.js";
import { getActiveSpawnPoints } from "./spawning.js";
import { canPlaceTower } from "./placement.js";
import { Tower } from "./tower.js";

export function render() {
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(state.camera.zoom, state.camera.zoom);
  ctx.translate(-state.camera.x, -state.camera.y);

  drawBackground();
  drawTilemap();
  drawGrid();
  drawSpawnPoints();
  drawFort();
  drawTowerRanges();
  drawTowers();
  drawTowerGhost();
  drawEnemies();
  drawProjectiles();

  ctx.restore();
}

function drawBackground() {
  if (state.bgImage) {
    ctx.drawImage(state.bgImage, 0, 0, CONFIG.MAP_WIDTH, CONFIG.MAP_HEIGHT);
  } else {
    ctx.fillStyle = "#3a5a40";
    ctx.fillRect(0, 0, CONFIG.MAP_WIDTH, CONFIG.MAP_HEIGHT);
  }
}

function drawTilemap() {
  const { tilemap } = state;
  const { TILE_SIZE, MAP_COLS, MAP_ROWS, TILE_COLORS } = CONFIG;

  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      const tile = tilemap[row][col];
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;

      ctx.fillStyle =
        tile === TILE.BLOCKED ? TILE_COLORS.blocked : TILE_COLORS.walkable;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    }
  }
}

function drawGrid() {
  const { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, MAP_COLS, MAP_ROWS } = CONFIG;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.20)";
  ctx.lineWidth = 1 / state.camera.zoom;
  ctx.beginPath();

  for (let col = 0; col <= MAP_COLS; col++) {
    const x = col * TILE_SIZE;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, MAP_HEIGHT);
  }

  for (let row = 0; row <= MAP_ROWS; row++) {
    const y = row * TILE_SIZE;
    ctx.moveTo(0, y);
    ctx.lineTo(MAP_WIDTH, y);
  }

  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.40)";
  ctx.lineWidth = 2 / state.camera.zoom;
  ctx.strokeRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
}

function drawSpawnPoints() {
  const half = CONFIG.TILE_SIZE * 0.38;
  const spawns = getActiveSpawnPoints();

  for (const { col, row } of spawns) {
    const { x, y } = tileToWorldCenter(col, row);

    ctx.fillStyle = CONFIG.MARKER_COLORS.spawn;
    ctx.fillRect(x - half, y - half, half * 2, half * 2);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 2 / state.camera.zoom;
    ctx.strokeRect(x - half, y - half, half * 2, half * 2);
  }
}

function drawFort() {
  const { col, row } = CONFIG.FORT;
  const { x, y } = tileToWorldCenter(col, row);
  const size = CONFIG.TILE_SIZE * 0.42;

  ctx.fillStyle = CONFIG.MARKER_COLORS.fort;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 3 / state.camera.zoom;
  ctx.stroke();
}

/** Draw range circles for selected, dragging, or preview towers. */
function drawTowerRanges() {
  const { placementTypeId, selected, drag, ghost } = state.towers;

  // Ghost preview range while placing
  if (placementTypeId) {
    const def = CONFIG.TOWER_TYPES[placementTypeId];
    drawRangeCircle(ctx, ghost.x, ghost.y, def.range, ghost.valid);
    if (def.attackType === "cone" || def.attackType === "directional") {
      // Default facing (matches Tower constructor) until the player rotates it after placing.
      drawConeIndicator(ctx, ghost.x, ghost.y, def.range, -Math.PI / 2, def.coneAngle, ghost.valid);
    }
  }

  // Selected tower range (when not being dragged)
  if (selected && !drag) {
    selected.drawRange(ctx, true);
  }

  // Tower being moved — show range at current drag position
  if (drag) {
    const valid = canPlaceTower(
      drag.tower.x,
      drag.tower.y,
      drag.tower.typeId,
      drag.tower
    );
    drag.tower.drawRange(ctx, valid);
  }
}

function drawTowers() {
  for (const tower of state.towers.list) {
    // Skip drawing the body while dragging (drawn in ghost pass with validity color)
    if (state.towers.drag && state.towers.drag.tower === tower) continue;
    tower.draw(ctx);
  }
}

/** Draw placement ghost or the tower currently being dragged. */
function drawTowerGhost() {
  const { placementTypeId, drag, ghost } = state.towers;

  if (placementTypeId) {
    const preview = new Tower(placementTypeId, ghost.x, ghost.y);
    preview.draw(ctx, { ghost: true, valid: ghost.valid });
    return;
  }

  if (drag) {
    const valid = canPlaceTower(
      drag.tower.x,
      drag.tower.y,
      drag.tower.typeId,
      drag.tower
    );
    drag.tower.draw(ctx, { ghost: true, valid });
  }
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    enemy.draw(ctx);
  }
}

function drawProjectiles() {
  for (const projectile of state.projectiles) {
    if (projectile.alive) projectile.draw(ctx);
  }
}

/**
 * Draw a range indicator circle.
 * @param {CanvasRenderingContext2D} drawCtx
 * @param {number} x
 * @param {number} y
 * @param {number} range
 * @param {boolean} [valid=true]
 */
export function drawRangeCircle(drawCtx, x, y, range, valid = true) {
  drawCtx.beginPath();
  drawCtx.arc(x, y, range, 0, Math.PI * 2);
  drawCtx.fillStyle = valid
    ? "rgba(52, 152, 219, 0.12)"
    : "rgba(231, 76, 60, 0.12)";
  drawCtx.fill();
  drawCtx.strokeStyle = valid
    ? "rgba(52, 152, 219, 0.55)"
    : "rgba(231, 76, 60, 0.55)";
  drawCtx.lineWidth = 2 / state.camera.zoom;
  drawCtx.stroke();
}

/**
 * Draw a filled pie-slice showing a directional tower's attack cone.
 * @param {CanvasRenderingContext2D} drawCtx
 * @param {number} x
 * @param {number} y
 * @param {number} range
 * @param {number} angle - Facing direction, radians
 * @param {number} coneAngle - Full cone width, radians
 * @param {boolean} [valid=true]
 */
export function drawConeIndicator(drawCtx, x, y, range, angle, coneAngle, valid = true) {
  const half = coneAngle / 2;

  drawCtx.beginPath();
  drawCtx.moveTo(x, y);
  drawCtx.arc(x, y, range, angle - half, angle + half);
  drawCtx.closePath();

  drawCtx.fillStyle = valid ? "rgba(52, 152, 219, 0.25)" : "rgba(231, 76, 60, 0.25)";
  drawCtx.fill();
  drawCtx.strokeStyle = valid ? "rgba(52, 152, 219, 0.8)" : "rgba(231, 76, 60, 0.8)";
  drawCtx.lineWidth = 2 / state.camera.zoom;
  drawCtx.stroke();
}

/**
 * Draw the small draggable handle used to rotate a directional tower.
 * @param {CanvasRenderingContext2D} drawCtx
 * @param {{x: number, y: number}} pos
 */
export function drawRotationHandle(drawCtx, pos) {
  drawCtx.beginPath();
  drawCtx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
  drawCtx.fillStyle = "#fff";
  drawCtx.fill();
  drawCtx.strokeStyle = "#222";
  drawCtx.lineWidth = 2 / state.camera.zoom;
  drawCtx.stroke();
}
