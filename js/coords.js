/**
 * COORDS.JS
 * Conversions between the three coordinate spaces used in this game:
 *   - tile (col, row)      — grid coordinates
 *   - world (x, y)         — pixel coordinates on the full map
 *   - screen (clientX, Y)  — pixel coordinates in the browser window
 */

import { CONFIG } from "./config.js";
import { canvas, state } from "./state.js";

export function tileToWorldCenter(col, row) {
  const half = CONFIG.TILE_SIZE / 2;
  return {
    x: col * CONFIG.TILE_SIZE + half,
    y: row * CONFIG.TILE_SIZE + half,
  };
}

export function worldToTile(worldX, worldY) {
  return {
    col: Math.floor(worldX / CONFIG.TILE_SIZE),
    row: Math.floor(worldY / CONFIG.TILE_SIZE),
  };
}

export function screenToWorld(screenX, screenY) {
  const rect = canvas.getBoundingClientRect();
  const { camera } = state;

  const canvasX = screenX - rect.left;
  const canvasY = screenY - rect.top;

  return {
    x: (canvasX - canvas.width / 2) / camera.zoom + camera.x,
    y: (canvasY - canvas.height / 2) / camera.zoom + camera.y,
  };
}

export function screenToTile(screenX, screenY) {
  const { x, y } = screenToWorld(screenX, screenY);
  return worldToTile(x, y);
}

/** Snap a world position to the nearest tile center. */
export function snapToTileCenter(worldX, worldY) {
  const { col, row } = worldToTile(worldX, worldY);
  return tileToWorldCenter(col, row);
}

/** Normalize an angle (radians) to the range [-PI, PI]. */
export function normalizeAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/** @returns {{x: number, y: number}} World position of the Fort tile center. */
export function getFortWorldPos() {
  return tileToWorldCenter(CONFIG.FORT.col, CONFIG.FORT.row);
}
