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
import { allSpawnsCanReachFort } from "./pathfinding.js";

/** Create a rows x cols grid, every tile starting walkable. */
export function createTilemap(cols, rows) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => TILE.WALKABLE)
  );
}

/**
 * Rebuild state.tilemap from scratch for the given map: all-walkable, then
 * that map's CONFIG.MAPS entry's defaultBlockedTiles painted BLOCKED. Call
 * once when a map is entered (see main.js's startGameLoop).
 */
export function resetTilemapForMap(mapId) {
  const mapDef = CONFIG.MAPS.find((m) => m.id === mapId);
  const grid = createTilemap(CONFIG.MAP_COLS, CONFIG.MAP_ROWS);

  for (const [col, row] of mapDef?.defaultBlockedTiles ?? []) {
    if (isTileInBounds(col, row)) grid[row][col] = TILE.BLOCKED;
  }

  state.tilemap = grid;
}

/**
 * Dev tool: read back every currently-BLOCKED tile as [col,row] pairs, in
 * the exact shape CONFIG.MAPS[...].defaultBlockedTiles expects. Wired to
 * the "Export Blocked Tiles" button (main.js) — paint the layout you want,
 * export it, paste the result into that map's config.js entry.
 */
export function exportBlockedTiles() {
  const cells = [];
  for (let row = 0; row < CONFIG.MAP_ROWS; row++) {
    for (let col = 0; col < CONFIG.MAP_COLS; col++) {
      if (state.tilemap[row][col] === TILE.BLOCKED) cells.push([col, row]);
    }
  }
  return cells;
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

/**
 * True if painting this tile BLOCKED would cut off any active spawn point's
 * path to the Fort. Mirrors placement.js's tower-seal check, but simulates
 * a terrain change instead of a tower (temporarily sets, tests, reverts).
 */
export function wouldBlockingTileSealPath(col, row) {
  const original = getTile(col, row);
  if (original === TILE.BLOCKED) return false; // already blocked, no change

  setTile(col, row, TILE.BLOCKED);
  const seals = !allSpawnsCanReachFort();
  setTile(col, row, original);

  return seals;
}
