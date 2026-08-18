/**
 * TILEMAP.JS
 * The 2D grid of walkable/blocked terrain tiles. Handles creation, bounds
 * checking, and reading/writing individual tile state.
 *
 * Note: isWalkableForPathfinding() also needs to know whether a tower is
 * sitting on a tile — that check lives in placement.js. This file imports
 * getTowerAtTile() from there; it's a circular import with placement.js,
 * which is safe here because the import is only used inside a function body
 * (called later during gameplay), not while the module first loads.
 */

import { CONFIG, TILE } from "./config.js";
import { state } from "./state.js";
import { getTowerAtTile } from "./placement.js";

/** Create a rows x cols grid, every tile starting walkable. */
export function createTilemap(cols, rows) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => TILE.WALKABLE)
  );
}

export function isTileInBounds(col, row) {
  return col >= 0 && col < CONFIG.MAP_COLS && row >= 0 && row < CONFIG.MAP_ROWS;
}

export function setTile(col, row, tileState) {
  if (!isTileInBounds(col, row)) return;
  state.tilemap[row][col] = tileState;
}

export function getTile(col, row) {
  if (!isTileInBounds(col, row)) return null;
  return state.tilemap[row][col];
}

/** True if the painted terrain tile is walkable (ignores towers). */
export function isTerrainWalkable(col, row) {
  return getTile(col, row) === TILE.WALKABLE;
}

/** True if enemies can pathfind through this tile (terrain + no tower). */
export function isWalkableForPathfinding(col, row) {
  return isTerrainWalkable(col, row) && !getTowerAtTile(col, row);
}
