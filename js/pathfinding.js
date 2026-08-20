/**
 * PATHFINDING.JS
 * A* search over the tilemap grid, allowing 8-directional (diagonal)
 * movement so enemies path more smoothly instead of only in straight
 * horizontal/vertical segments.
 *
 * PATH_NEIGHBORS (orthogonal only) stays exported as-is — placement.js
 * reuses it for a different, unrelated check (blocked-tile adjacency for
 * tower placement), which should NOT suddenly become diagonal-aware just
 * because pathfinding gained diagonal movement. DIAGONAL_NEIGHBORS is
 * private to this file, only combined with PATH_NEIGHBORS for the A* search.
 */

import { CONFIG } from "./config.js";
import { isWalkableForPathfinding } from "./tilemap.js";
import { getActiveSpawnPoints } from "./spawning.js";

/** @returns {boolean} True if every active spawn point currently has a path to the Fort. */
export function allSpawnsCanReachFort() {
  return getActiveSpawnPoints().every(
    (spawn) => findPath(spawn.col, spawn.row, CONFIG.FORT.col, CONFIG.FORT.row) !== null
  );
}

export const PATH_NEIGHBORS = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];

const DIAGONAL_NEIGHBORS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

const ALL_NEIGHBORS = [...PATH_NEIGHBORS, ...DIAGONAL_NEIGHBORS];

export function tileKey(col, row) {
  return row * CONFIG.MAP_COLS + col;
}

// Octile distance — the admissible heuristic for 8-directional grids where
// diagonal steps cost sqrt(2) and orthogonal steps cost 1. Manhattan
// distance (used before diagonal movement existed) would overestimate here
// and can make A* return non-shortest paths.
function heuristic(col, row, goalCol, goalRow) {
  const dx = Math.abs(col - goalCol);
  const dy = Math.abs(row - goalRow);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
}

export function findPath(startCol, startRow, goalCol, goalRow) {
  if (
    !isWalkableForPathfinding(startCol, startRow) ||
    !isWalkableForPathfinding(goalCol, goalRow)
  ) {
    return null;
  }

  const startKey = tileKey(startCol, startRow);
  const goalKey = tileKey(goalCol, goalRow);

  if (startKey === goalKey) {
    return [{ col: startCol, row: startRow }];
  }

  const open = [
    {
      col: startCol,
      row: startRow,
      g: 0,
      f: heuristic(startCol, startRow, goalCol, goalRow),
    },
  ];
  const cameFrom = new Map();
  const gScore = new Map([[startKey, 0]]);
  const closed = new Set();

  while (open.length > 0) {
    const current = popLowestF(open);
    const currentKey = tileKey(current.col, current.row);

    if (currentKey === goalKey) {
      return reconstructPath(
        cameFrom,
        current.col,
        current.row,
        startCol,
        startRow
      );
    }

    if (closed.has(currentKey)) continue;
    closed.add(currentKey);

    for (const [dc, dr] of ALL_NEIGHBORS) {
      const nc = current.col + dc;
      const nr = current.row + dr;
      if (!isWalkableForPathfinding(nc, nr)) continue;

      const isDiagonal = dc !== 0 && dr !== 0;

      // Don't let enemies cut through a corner diagonally when both of the
      // orthogonal tiles forming that corner are blocked — otherwise they'd
      // visually clip through a wall/tower corner.
      if (
        isDiagonal &&
        (!isWalkableForPathfinding(current.col + dc, current.row) ||
          !isWalkableForPathfinding(current.col, current.row + dr))
      ) {
        continue;
      }

      const stepCost = isDiagonal ? Math.SQRT2 : 1;
      const neighborKey = tileKey(nc, nr);
      const tentativeG = current.g + stepCost;

      if (tentativeG >= (gScore.get(neighborKey) ?? Infinity)) continue;

      cameFrom.set(neighborKey, currentKey);
      gScore.set(neighborKey, tentativeG);
      open.push({
        col: nc,
        row: nr,
        g: tentativeG,
        f: tentativeG + heuristic(nc, nr, goalCol, goalRow),
      });
    }
  }

  return null;
}

function popLowestF(open) {
  let best = 0;
  for (let i = 1; i < open.length; i++) {
    if (open[i].f < open[best].f) best = i;
  }
  return open.splice(best, 1)[0];
}

function reconstructPath(cameFrom, endCol, endRow, startCol, startRow) {
  const path = [{ col: endCol, row: endRow }];
  let key = tileKey(endCol, endRow);

  while (cameFrom.has(key)) {
    const prevKey = cameFrom.get(key);
    const col = prevKey % CONFIG.MAP_COLS;
    const row = Math.floor(prevKey / CONFIG.MAP_COLS);
    path.unshift({ col, row });
    key = prevKey;
  }

  if (path[0].col !== startCol || path[0].row !== startRow) return null;
  return path;
}
