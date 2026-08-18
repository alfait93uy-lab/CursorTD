/**
 * PATHFINDING.JS
 * A* search over the tilemap grid. Used to route enemies from a spawn
 * point to the Fort, treating tower-occupied tiles as blocked.
 */

import { CONFIG } from "./config.js";
import { isWalkableForPathfinding } from "./tilemap.js";

export const PATH_NEIGHBORS = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];

export function tileKey(col, row) {
  return row * CONFIG.MAP_COLS + col;
}

function heuristic(col, row, goalCol, goalRow) {
  return Math.abs(col - goalCol) + Math.abs(row - goalRow);
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

    for (const [dc, dr] of PATH_NEIGHBORS) {
      const nc = current.col + dc;
      const nr = current.row + dr;
      if (!isWalkableForPathfinding(nc, nr)) continue;

      const neighborKey = tileKey(nc, nr);
      const tentativeG = current.g + 1;

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
