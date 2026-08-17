/**
 * Tower Defense — Phase 7: XP & Skill Tree
 *
 * Builds on Phase 6 and adds:
 *   - XP from enemy kills
 *   - Skill Tree to unlock tower types
 *   - Dynamic tower bar based on unlocks
 */

// =============================================================================
// GAME PHASE
// =============================================================================

const GamePhase = {
  PLACEMENT: "placement",
  COMBAT: "combat",
};

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  TILE_SIZE: 64,
  MAP_COLS: 50,
  MAP_ROWS: 38,

  CAMERA_SPEED: 400,
  ZOOM_MIN: 0.4,
  ZOOM_MAX: 2.5,
  ZOOM_STEP: 0.1,

  BG_IMAGE_URL:
    "https://placehold.co/3200x2432/3a5a40/8fbc8f?text=Tower+Defense+Map",

  TILE_COLORS: {
    walkable: "rgba(80, 200, 120, 0.30)",
    blocked: "rgba(200, 70, 70, 0.50)",
  },

  // --- Phase 3 & 6: enemies ---
  ENEMY_TYPES: {
    basic: {
      id: "basic",
      monsterValue: 10,
      hp: 100,
      speed: 140,
      xpReward: 5,
      color: "#e74c3c",
    },
    tough: {
      id: "tough",
      monsterValue: 25,
      hp: 200,
      speed: 110,
      xpReward: 12,
      color: "#8e44ad",
    },
  },

  /**
   * Wave definitions — each wave has a Monster Value budget and spawn groups.
   * Monster Value ≈ sum of (enemy.monsterValue × count) per group.
   */
  WAVES: [
    {
      number: 1,
      monsterValue: 30,
      groups: [{ type: "basic", count: 3, spawnInterval: 1.2 }],
    },
    {
      number: 2,
      monsterValue: 65,
      groups: [
        { type: "basic", count: 4, spawnInterval: 1.0 },
        { type: "tough", count: 1, spawnInterval: 1.5 },
      ],
    },
    {
      number: 3,
      monsterValue: 110,
      groups: [
        { type: "basic", count: 5, spawnInterval: 0.9 },
        { type: "tough", count: 3, spawnInterval: 1.1 },
      ],
    },
  ],

  MAX_SPAWN_POINTS: 5,
  SPAWN_POINTS: [
    { col: 2, row: 10 },
    { col: 2, row: 28 },
    null,
    null,
    null,
  ],
  FORT: { col: 46, row: 19 },
  MARKER_COLORS: {
    spawn: "#9b59b6",
    fort: "#f1c40f",
    enemy: ["#e74c3c", "#3498db", "#e67e22", "#1abc9c", "#e91e63"],
  },

  // --- Phase 4, 5 & 7: towers (unlocked via Skill Tree) ---
  STARTING_XP: 30,

  /** Starting skill nodes — each unlocks a tower type */
  SKILL_TREE: [
    { id: "slayer", label: "Slayer", towerType: "slayer", cost: 10 },
    { id: "spearman", label: "Spearman", towerType: "spearman", cost: 10 },
    { id: "striker", label: "Striker", towerType: "striker", cost: 10 },
    { id: "marksman", label: "Marksman", towerType: "marksman", cost: 10 },
  ],

  TOWER_TYPES: {
    slayer: {
      id: "slayer",
      label: "Slayer",
      radius: 28,
      range: 200,
      damage: 40,
      attackSpeed: 0.9,
      projectileSpeed: 380,
      projectileColor: "#e74c3c",
      color: "#e74c3c",
    },
    spearman: {
      id: "spearman",
      label: "Spearman",
      radius: 28,
      range: 256,
      damage: 25,
      attackSpeed: 1.2,
      projectileSpeed: 420,
      projectileColor: "#2ecc71",
      color: "#2ecc71",
    },
    striker: {
      id: "striker",
      label: "Striker",
      radius: 26,
      range: 220,
      damage: 18,
      attackSpeed: 2.0,
      projectileSpeed: 500,
      projectileColor: "#e67e22",
      color: "#e67e22",
    },
    marksman: {
      id: "marksman",
      label: "Marksman",
      radius: 26,
      range: 320,
      damage: 20,
      attackSpeed: 1.0,
      projectileSpeed: 550,
      projectileColor: "#3498db",
      color: "#3498db",
    },
  },
};

CONFIG.MAP_WIDTH = CONFIG.MAP_COLS * CONFIG.TILE_SIZE;
CONFIG.MAP_HEIGHT = CONFIG.MAP_ROWS * CONFIG.TILE_SIZE;

// =============================================================================
// TILE TYPES
// =============================================================================

const TILE = {
  WALKABLE: 0,
  BLOCKED: 1,
};

// =============================================================================
// STATE
// =============================================================================

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("game-canvas");

/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext("2d");

const state = {
  phase: GamePhase.PLACEMENT,
  camera: { x: CONFIG.MAP_WIDTH / 2, y: CONFIG.MAP_HEIGHT / 2, zoom: 1 },
  keys: { w: false, a: false, s: false, d: false },
  tilemap: createTilemap(CONFIG.MAP_COLS, CONFIG.MAP_ROWS),
  enemies: [],
  projectiles: [],
  nextSpawnIndex: 0,
  bgImage: null,
  lastFrameTime: 0,
  paint: null,

  /** Tower placement & selection state */
  towers: {
    list: [],
    /** Tower type id selected from the bar (placement mode), or null */
    placementTypeId: null,
    /** Placed tower currently selected (shows range) */
    selected: null,
    /** Active drag session when moving a placed tower */
    drag: null,
    /** Ghost preview position while placing a new tower */
    ghost: { x: 0, y: 0, valid: false },
  },

  /** Wave spawning & progression */
  wave: {
    /** Index of the next wave in CONFIG.WAVES */
    nextWaveIndex: 0,
    /** True while a wave is in progress (spawning or fighting) */
    active: false,
    /** Wave number currently being played (0 when idle) */
    currentWaveNumber: 0,
    /** Queue of pending spawns: { typeId, spawnSlot, delay } */
    spawnQueue: [],
    /** Countdown until the next spawn */
    spawnCooldown: 0,
    /** All enemies from the queue have been spawned */
    spawningComplete: false,
  },

  /** Player progression */
  player: {
    xp: CONFIG.STARTING_XP,
    /** Set of unlocked tower type ids */
    unlockedTowers: new Set(),
  },

  /** UI overlay state */
  ui: {
    skillTreeOpen: false,
  },
};

// =============================================================================
// TOWER
// =============================================================================

/** Placeholder tower with combat stats driven by CONFIG.TOWER_TYPES. */
class Tower {
  constructor(typeId, x, y) {
    this.typeId = typeId;
    this.def = CONFIG.TOWER_TYPES[typeId];
    this.x = x;
    this.y = y;
    this.attackCooldown = 0;
  }

  /** @param {number} dt */
  update(dt) {
    if (!isCombatPhase()) return;

    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt;
    }

    const target = this.findTarget();
    if (!target || this.attackCooldown > 0) return;

    this.fireAt(target);
    this.attackCooldown = 1 / this.def.attackSpeed;
  }

  /** Nearest living enemy within range. */
  findTarget() {
    let best = null;
    let bestDist = Infinity;

    for (const enemy of state.enemies) {
      if (!enemy.isAlive()) continue;

      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist <= this.def.range && dist < bestDist) {
        best = enemy;
        bestDist = dist;
      }
    }

    return best;
  }

  /** @param {Enemy} target */
  fireAt(target) {
    state.projectiles.push(
      new Projectile(
        this.x,
        this.y,
        target,
        this.def.damage,
        this.def.projectileSpeed,
        this.def.projectileColor
      )
    );
  }

  /** @returns {{ col: number, row: number }} Tile the tower occupies */
  getTileCoords() {
    return worldToTile(this.x, this.y);
  }

  /** @returns {boolean} True if a world point is inside the tower hitbox */
  containsPoint(worldX, worldY) {
    const hitRadius = this.def.radius * 1.15;
    return Math.hypot(worldX - this.x, worldY - this.y) <= hitRadius;
  }

  /**
   * @param {CanvasRenderingContext2D} drawCtx
   * @param {{ ghost?: boolean, valid?: boolean }} [options]
   */
  draw(drawCtx, options = {}) {
    const { ghost = false, valid = true } = options;
    const r = this.def.radius;

    drawCtx.save();
    drawCtx.globalAlpha = ghost ? 0.55 : 1;

    // Body — simple square placeholder
    drawCtx.fillStyle = ghost && !valid ? "#e74c3c" : this.def.color;
    drawCtx.fillRect(this.x - r, this.y - r, r * 2, r * 2);

    drawCtx.strokeStyle = ghost ? "rgba(255,255,255,0.7)" : "#fff";
    drawCtx.lineWidth = 2 / state.camera.zoom;
    drawCtx.strokeRect(this.x - r, this.y - r, r * 2, r * 2);

    // Small turret dot on top
    drawCtx.fillStyle = "rgba(0,0,0,0.35)";
    drawCtx.beginPath();
    drawCtx.arc(this.x, this.y, r * 0.25, 0, Math.PI * 2);
    drawCtx.fill();

    drawCtx.restore();
  }

  /**
   * @param {CanvasRenderingContext2D} drawCtx
   * @param {boolean} [valid=true]
   */
  drawRange(drawCtx, valid = true) {
    drawRangeCircle(drawCtx, this.x, this.y, this.def.range, valid);
  }
}

// =============================================================================
// PROJECTILE
// =============================================================================

/** Simple homing projectile fired by towers. */
class Projectile {
  /**
   * @param {number} x
   * @param {number} y
   * @param {Enemy} target
   * @param {number} damage
   * @param {number} speed
   * @param {string} color
   */
  constructor(x, y, target, damage, speed, color) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.speed = speed;
    this.color = color;
    this.radius = 7;
    this.alive = true;
  }

  /** @param {number} dt */
  update(dt) {
    if (!this.alive) return;

    if (!this.target.isAlive()) {
      this.alive = false;
      return;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const hitDist = this.target.radius + this.radius;

    if (dist <= hitDist) {
      this.target.takeDamage(this.damage);
      this.alive = false;
      return;
    }

    const step = this.speed * dt;
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
  }

  /** @param {CanvasRenderingContext2D} drawCtx */
  draw(drawCtx) {
    drawCtx.fillStyle = this.color;
    drawCtx.beginPath();
    drawCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    drawCtx.fill();

    drawCtx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    drawCtx.lineWidth = 1.5 / state.camera.zoom;
    drawCtx.stroke();
  }
}

// =============================================================================
// TOWER PLACEMENT
// =============================================================================

/** Snap a world position to the nearest tile center. */
function snapToTileCenter(worldX, worldY) {
  const { col, row } = worldToTile(worldX, worldY);
  return tileToWorldCenter(col, row);
}

/** @returns {boolean} True if the tile is reserved for spawn or fort. */
function isReservedTile(col, row) {
  if (col === CONFIG.FORT.col && row === CONFIG.FORT.row) return true;
  for (const spawn of getActiveSpawnPoints()) {
    if (spawn.col === col && spawn.row === row) return true;
  }
  return false;
}

/** @returns {Tower|null} Tower occupying a tile, if any. */
function getTowerAtTile(col, row, ignoreTower = null) {
  for (const tower of state.towers.list) {
    if (tower === ignoreTower) continue;
    const tc = tower.getTileCoords();
    if (tc.col === col && tc.row === row) return tower;
  }
  return null;
}

/** True if any orthogonally adjacent tile is terrain-blocked (painted). */
function isAdjacentToBlockedTile(col, row) {
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
function canPlaceTower(x, y, typeId, ignoreTower = null) {
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
function placeTower(typeId, x, y) {
  state.towers.list.push(new Tower(typeId, x, y));
}

/** @returns {Tower|null} Topmost tower under the cursor, if any. */
function getTowerAt(worldX, worldY) {
  for (let i = state.towers.list.length - 1; i >= 0; i--) {
    if (state.towers.list[i].containsPoint(worldX, worldY)) {
      return state.towers.list[i];
    }
  }
  return null;
}

/** Enter placement mode for a tower type from the bar. */
function selectTowerType(typeId) {
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
function cancelTowerPlacement() {
  state.towers.placementTypeId = null;
  updateTowerBarUI();
  updateCanvasCursor();
}

/** Highlight the active tower button in the bar. */
function updateTowerBarUI() {
  document.querySelectorAll(".tower-btn").forEach((btn) => {
    const typeId = btn.dataset.towerType;
    btn.classList.toggle("selected", typeId === state.towers.placementTypeId);
  });
}

/**
 * Rebuild the tower bar from unlocked tower types.
 * Called after a skill tree unlock.
 */
function renderTowerBar() {
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
function updateCanvasCursor() {
  canvas.classList.remove("cursor-place", "cursor-move");
  if (state.towers.placementTypeId) {
    canvas.classList.add("cursor-place");
  } else if (state.towers.drag) {
    canvas.classList.add("cursor-move");
  }
}

// =============================================================================
// ENEMY
// =============================================================================

class Enemy {
  /**
   * @param {{ col: number, row: number }[]} path
   * @param {number} spawnIndex
   * @param {{ typeId?: string, isWaveEnemy?: boolean }} [options]
   */
  constructor(path, spawnIndex, options = {}) {
    const typeId = options.typeId || "basic";
    const typeDef = CONFIG.ENEMY_TYPES[typeId];

    this.path = path;
    this.spawnIndex = spawnIndex;
    this.typeId = typeId;
    this.monsterValue = typeDef.monsterValue;
    this.isWaveEnemy = options.isWaveEnemy ?? false;
    this.waypointIndex = 1;
    this.speed = typeDef.speed;
    this.radius = CONFIG.TILE_SIZE * 0.32;
    this.maxHp = typeDef.hp;
    this.hp = typeDef.hp;
    this.dead = false;
    this.reachedFort = false;

    const start = tileToWorldCenter(path[0].col, path[0].row);
    this.x = start.x;
    this.y = start.y;

    this.color =
      typeDef.color ||
      CONFIG.MARKER_COLORS.enemy[spawnIndex % CONFIG.MARKER_COLORS.enemy.length];
  }

  isAlive() {
    return !this.dead && this.hp > 0;
  }

  /** @param {number} amount */
  takeDamage(amount) {
    if (!this.isAlive()) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.dead = true;
      awardXp(getEnemyXpReward(this.typeId));
    }
  }

  update(dt) {
    if (!this.isAlive() || this.reachedFort) return;

    const target = this.getTargetPosition();
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 2) {
      if (this.waypointIndex >= this.path.length - 1) {
        this.x = target.x;
        this.y = target.y;
        this.reachedFort = true;
        return;
      }
      this.waypointIndex++;
      return this.update(dt);
    }

    const step = Math.min(this.speed * dt, distance);
    this.x += (dx / distance) * step;
    this.y += (dy / distance) * step;
  }

  getTargetPosition() {
    const wp = this.path[this.waypointIndex];
    return tileToWorldCenter(wp.col, wp.row);
  }

  draw(drawCtx) {
    if (!this.isAlive()) return;

    drawCtx.fillStyle = this.color;
    drawCtx.beginPath();
    drawCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    drawCtx.fill();

    drawCtx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    drawCtx.lineWidth = 2 / state.camera.zoom;
    drawCtx.stroke();

    this.drawHealthBar(drawCtx);
  }

  /** @param {CanvasRenderingContext2D} drawCtx */
  drawHealthBar(drawCtx) {
    if (this.hp >= this.maxHp) return;

    const barW = this.radius * 2.8;
    const barH = 5 / state.camera.zoom;
    const x = this.x - barW / 2;
    const y = this.y - this.radius - barH - 5 / state.camera.zoom;
    const pct = this.hp / this.maxHp;

    drawCtx.fillStyle = "rgba(0, 0, 0, 0.55)";
    drawCtx.fillRect(x, y, barW, barH);

    drawCtx.fillStyle =
      pct > 0.5 ? "#2ecc71" : pct > 0.25 ? "#f1c40f" : "#e74c3c";
    drawCtx.fillRect(x, y, barW * pct, barH);
  }
}

// =============================================================================
// PATHFINDING (A*)
// =============================================================================

const PATH_NEIGHBORS = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];

function tileKey(col, row) {
  return row * CONFIG.MAP_COLS + col;
}

function heuristic(col, row, goalCol, goalRow) {
  return Math.abs(col - goalCol) + Math.abs(row - goalRow);
}

function findPath(startCol, startRow, goalCol, goalRow) {
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

// =============================================================================
// SPAWNING
// =============================================================================

function getActiveSpawnPoints() {
  return CONFIG.SPAWN_POINTS.filter((spawn) => spawn !== null);
}

/**
 * Spawn an enemy from a spawn point along a path to the Fort.
 * @param {number} spawnSlot - Index into active spawn points
 * @param {string} typeId - Key in CONFIG.ENEMY_TYPES
 * @param {boolean} isWaveEnemy - Whether this enemy belongs to the current wave
 * @returns {Enemy|null}
 */
function spawnEnemyFromSpawn(spawnSlot, typeId = "basic", isWaveEnemy = false) {
  const spawns = getActiveSpawnPoints();
  if (spawns.length === 0) {
    console.warn("No spawn points configured.");
    return null;
  }

  const spawn = spawns[spawnSlot % spawns.length];
  const { col: fortCol, row: fortRow } = CONFIG.FORT;

  const path = findPath(spawn.col, spawn.row, fortCol, fortRow);
  if (!path) {
    console.warn(
      `No path from spawn (${spawn.col}, ${spawn.row}) to fort (${fortCol}, ${fortRow}).`
    );
    return null;
  }

  const enemy = new Enemy(path, spawnSlot % spawns.length, {
    typeId,
    isWaveEnemy,
  });
  state.enemies.push(enemy);
  return enemy;
}

/** Manual test spawn — not part of a wave. Enters combat so towers can attack. */
function spawnTestEnemy() {
  const spawnSlot = state.nextSpawnIndex;
  state.nextSpawnIndex++;

  const enemy = spawnEnemyFromSpawn(spawnSlot, "basic", false);
  if (!enemy) return;

  if (isPlacementPhase() && !state.wave.active) {
    setGamePhase(GamePhase.COMBAT);
  }
}

// =============================================================================
// WAVE MANAGER
// =============================================================================

/** @returns {object|null} Next wave config, or null if all waves are done. */
function getNextWaveConfig() {
  const { nextWaveIndex } = state.wave;
  return CONFIG.WAVES[nextWaveIndex] ?? null;
}

/** Build a timed spawn queue from a wave definition. */
function buildWaveSpawnQueue(waveConfig) {
  const spawns = getActiveSpawnPoints();
  const queue = [];
  let spawnSlot = 0;

  for (const group of waveConfig.groups) {
    for (let i = 0; i < group.count; i++) {
      queue.push({
        typeId: group.type,
        spawnSlot: spawnSlot % spawns.length,
        delay: group.spawnInterval,
      });
      spawnSlot++;
    }
  }

  return queue;
}

/** Calculate total Monster Value for a wave (for display / validation). */
function calculateWaveMonsterValue(waveConfig) {
  return waveConfig.groups.reduce((total, group) => {
    const typeDef = CONFIG.ENEMY_TYPES[group.type];
    return total + typeDef.monsterValue * group.count;
  }, 0);
}

/** True if a new wave can be started. */
function canStartWave() {
  return (
    isPlacementPhase() &&
    !state.wave.active &&
    getNextWaveConfig() !== null
  );
}

/** Start the next wave — enters combat and begins spawning. */
function startNextWave() {
  if (!canStartWave()) return false;

  const waveConfig = getNextWaveConfig();
  const wave = state.wave;

  wave.active = true;
  wave.currentWaveNumber = waveConfig.number;
  wave.spawnQueue = buildWaveSpawnQueue(waveConfig);
  wave.spawnCooldown = 0;
  wave.spawningComplete = wave.spawnQueue.length === 0;

  // Spawn the first enemy immediately, then use intervals for the rest
  if (wave.spawnQueue.length > 0) {
    const first = wave.spawnQueue.shift();
    spawnEnemyFromSpawn(first.spawnSlot, first.typeId, true);
    wave.spawnCooldown = first.delay;
  }

  setGamePhase(GamePhase.COMBAT);
  updateWaveUI();
  updatePhaseUI();

  console.log(
    `Wave ${waveConfig.number} started — Monster Value: ${waveConfig.monsterValue} (actual: ${calculateWaveMonsterValue(waveConfig)})`
  );

  return true;
}

/** @returns {number} Wave enemies still on the map (alive and not at fort). */
function countActiveWaveEnemies() {
  return state.enemies.filter(
    (enemy) =>
      enemy.isWaveEnemy && enemy.isAlive() && !enemy.reachedFort
  ).length;
}

/** Called when all wave enemies are defeated. */
function completeWave() {
  const wave = state.wave;
  console.log(`Wave ${wave.currentWaveNumber} complete!`);

  wave.active = false;
  wave.currentWaveNumber = 0;
  wave.spawnQueue = [];
  wave.spawningComplete = false;
  wave.nextWaveIndex++;

  setGamePhase(GamePhase.PLACEMENT);
  updateWaveUI();
  updatePhaseUI();
}

/** Process wave spawning and check for wave completion. */
function updateWaveManager(dt) {
  const wave = state.wave;
  if (!wave.active) return;

  // Spawn enemies from the queue over time
  if (!wave.spawningComplete) {
    wave.spawnCooldown -= dt;

    if (wave.spawnCooldown <= 0 && wave.spawnQueue.length > 0) {
      const entry = wave.spawnQueue.shift();
      spawnEnemyFromSpawn(entry.spawnSlot, entry.typeId, true);
      wave.spawnCooldown = entry.delay;
    }

    if (wave.spawnQueue.length === 0) {
      wave.spawningComplete = true;
    }
  }

  // Wave cleared once all spawns are done and every wave enemy is gone
  if (wave.spawningComplete && countActiveWaveEnemies() === 0) {
    completeWave();
  }
}

// =============================================================================
// XP & SKILL TREE
// =============================================================================

/** @returns {number} XP reward for killing an enemy type. */
function getEnemyXpReward(typeId) {
  return CONFIG.ENEMY_TYPES[typeId]?.xpReward ?? 5;
}

/** Add XP and refresh UI. */
function awardXp(amount) {
  if (amount <= 0) return;
  state.player.xp += amount;
  updateXpUI();
}

/** @returns {boolean} True if the player has unlocked this tower type. */
function isTowerUnlocked(typeId) {
  return state.player.unlockedTowers.has(typeId);
}

/** Update XP display in the HUD and skill tree panel. */
function updateXpUI() {
  const text = `XP: ${state.player.xp}`;
  document.getElementById("xp-display").textContent = text;
  document.getElementById("skill-tree-xp").textContent = text;
}

/** @returns {boolean} True if the skill tree overlay is open. */
function isSkillTreeOpen() {
  return state.ui.skillTreeOpen;
}

function openSkillTree() {
  state.ui.skillTreeOpen = true;
  const panel = document.getElementById("skill-tree-panel");
  panel.classList.remove("hidden");
  panel.setAttribute("aria-hidden", "false");
  cancelTowerInteraction();
  renderSkillTreeNodes();
  updateXpUI();
}

function closeSkillTree() {
  state.ui.skillTreeOpen = false;
  const panel = document.getElementById("skill-tree-panel");
  panel.classList.add("hidden");
  panel.setAttribute("aria-hidden", "true");
}

function toggleSkillTree() {
  if (isSkillTreeOpen()) closeSkillTree();
  else openSkillTree();
}

/** Render skill tree node buttons based on unlock state. */
function renderSkillTreeNodes() {
  const container = document.getElementById("skill-tree-nodes");
  container.innerHTML = "";

  for (const node of CONFIG.SKILL_TREE) {
    const towerDef = CONFIG.TOWER_TYPES[node.towerType];
    const unlocked = isTowerUnlocked(node.towerType);
    const canAfford = state.player.xp >= node.cost;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "skill-node";
    btn.dataset.nodeId = node.id;

    if (unlocked) {
      btn.classList.add("unlocked");
      btn.disabled = true;
      btn.innerHTML = `
        <span class="skill-node-icon tower-icon-${node.towerType}"></span>
        <span class="skill-node-name">${node.label}</span>
        <span class="skill-node-status">Unlocked</span>
      `;
    } else {
      btn.disabled = !canAfford;
      btn.innerHTML = `
        <span class="skill-node-icon tower-icon-${node.towerType}"></span>
        <span class="skill-node-name">${node.label}</span>
        <span class="skill-node-cost">${node.cost} XP</span>
      `;
      btn.addEventListener("click", () => tryUnlockSkill(node.id));
    }

    if (towerDef) {
      btn.title = `${node.label} — ${towerDef.damage} dmg, ${towerDef.range}px range`;
    }

    container.appendChild(btn);
  }
}

/**
 * Attempt to unlock a skill tree node.
 * @param {string} nodeId
 * @returns {boolean}
 */
function tryUnlockSkill(nodeId) {
  const node = CONFIG.SKILL_TREE.find((n) => n.id === nodeId);
  if (!node) return false;
  if (isTowerUnlocked(node.towerType)) return false;
  if (state.player.xp < node.cost) return false;

  state.player.xp -= node.cost;
  state.player.unlockedTowers.add(node.towerType);

  renderSkillTreeNodes();
  renderTowerBar();
  updateXpUI();

  console.log(`Unlocked tower: ${node.label}`);
  return true;
}

// =============================================================================
// TILEMAP
// =============================================================================

function createTilemap(cols, rows) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => TILE.WALKABLE)
  );
}

function isTileInBounds(col, row) {
  return col >= 0 && col < CONFIG.MAP_COLS && row >= 0 && row < CONFIG.MAP_ROWS;
}

function setTile(col, row, tileState) {
  if (!isTileInBounds(col, row)) return;
  state.tilemap[row][col] = tileState;
}

function getTile(col, row) {
  if (!isTileInBounds(col, row)) return null;
  return state.tilemap[row][col];
}

/** True if the painted terrain tile is walkable (ignores towers). */
function isTerrainWalkable(col, row) {
  return getTile(col, row) === TILE.WALKABLE;
}

/** True if enemies can pathfind through this tile (terrain + no tower). */
function isWalkableForPathfinding(col, row) {
  return isTerrainWalkable(col, row) && !getTowerAtTile(col, row);
}

// =============================================================================
// GAME PHASE
// =============================================================================

function isPlacementPhase() {
  return state.phase === GamePhase.PLACEMENT;
}

function isCombatPhase() {
  return state.phase === GamePhase.COMBAT;
}

function setGamePhase(phase) {
  state.phase = phase;

  if (isCombatPhase()) {
    cancelTowerInteraction();
  }

  updatePhaseUI();
  updateWaveUI();
}

function updatePhaseUI() {
  const indicator = document.getElementById("phase-indicator");
  const towerBar = document.getElementById("tower-bar");

  if (isCombatPhase()) {
    indicator.textContent = "Phase: Combat";
    indicator.classList.add("combat");
    towerBar.classList.add("disabled");
  } else {
    indicator.textContent = "Phase: Placement";
    indicator.classList.remove("combat");
    towerBar.classList.remove("disabled");
  }
}

function updateWaveUI() {
  const btn = document.getElementById("wave-btn");
  const indicator = document.getElementById("wave-indicator");
  const wave = state.wave;
  const nextWave = getNextWaveConfig();

  if (wave.active) {
    btn.textContent = `Wave ${wave.currentWaveNumber}…`;
    btn.disabled = true;
    btn.classList.add("wave-active");
    indicator.textContent = `Wave: ${wave.currentWaveNumber}`;
    indicator.classList.add("active");
    return;
  }

  btn.classList.remove("wave-active");

  if (nextWave) {
    btn.textContent = `Send Wave ${nextWave.number} (F1)`;
    btn.disabled = !canStartWave();
    indicator.textContent = `Next: Wave ${nextWave.number} (MV ${nextWave.monsterValue})`;
  } else {
    btn.textContent = "All Waves Complete";
    btn.disabled = true;
    indicator.textContent = "Wave: Complete";
  }

  indicator.classList.remove("active");
}

// =============================================================================
// INITIALIZATION
// =============================================================================

function init() {
  resizeCanvas();
  loadBackgroundImage();
  setupInput();
  setupTowerBar();
  setupSkillTree();
  updateXpUI();
  renderTowerBar();
  updatePhaseUI();
  updateWaveUI();
  window.addEventListener("resize", onResize);
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

// =============================================================================
// INPUT
// =============================================================================

function setupInput() {
  window.addEventListener("keydown", (e) => {
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
function cancelTowerInteraction() {
  if (state.towers.drag) {
    const { tower, origX, origY } = state.towers.drag;
    tower.x = origX;
    tower.y = origY;
    state.towers.drag = null;
  }

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

  // --- Placement mode: left-click places a new tower (no tile painting) ---
  if (state.towers.placementTypeId && isPlacementPhase()) {
    const snapped = snapToTileCenter(world.x, world.y);
    if (
      canPlaceTower(
        snapped.x,
        snapped.y,
        state.towers.placementTypeId
      )
    ) {
      placeTower(state.towers.placementTypeId, snapped.x, snapped.y);
    }
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

// =============================================================================
// COORDINATE CONVERSION
// =============================================================================

function tileToWorldCenter(col, row) {
  const half = CONFIG.TILE_SIZE / 2;
  return {
    x: col * CONFIG.TILE_SIZE + half,
    y: row * CONFIG.TILE_SIZE + half,
  };
}

function worldToTile(worldX, worldY) {
  return {
    col: Math.floor(worldX / CONFIG.TILE_SIZE),
    row: Math.floor(worldY / CONFIG.TILE_SIZE),
  };
}

function screenToWorld(screenX, screenY) {
  const rect = canvas.getBoundingClientRect();
  const { camera } = state;

  const canvasX = screenX - rect.left;
  const canvasY = screenY - rect.top;

  return {
    x: (canvasX - canvas.width / 2) / camera.zoom + camera.x,
    y: (canvasY - canvas.height / 2) / camera.zoom + camera.y,
  };
}

function screenToTile(screenX, screenY) {
  const { x, y } = screenToWorld(screenX, screenY);
  return worldToTile(x, y);
}

// =============================================================================
// CAMERA
// =============================================================================

function updateCamera(dt) {
  const { keys, camera } = state;
  let dx = 0;
  let dy = 0;

  if (keys.w) dy -= 1;
  if (keys.s) dy += 1;
  if (keys.a) dx -= 1;
  if (keys.d) dx += 1;

  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.SQRT2;
    dx *= inv;
    dy *= inv;
  }

  camera.x += dx * CONFIG.CAMERA_SPEED * dt;
  camera.y += dy * CONFIG.CAMERA_SPEED * dt;

  clampCamera();
}

function clampCamera() {
  const { camera } = state;
  const halfViewW = canvas.width / (2 * camera.zoom);
  const halfViewH = canvas.height / (2 * camera.zoom);

  if (halfViewW * 2 >= CONFIG.MAP_WIDTH) {
    camera.x = CONFIG.MAP_WIDTH / 2;
  } else {
    camera.x = clamp(camera.x, halfViewW, CONFIG.MAP_WIDTH - halfViewW);
  }

  if (halfViewH * 2 >= CONFIG.MAP_HEIGHT) {
    camera.y = CONFIG.MAP_HEIGHT / 2;
  } else {
    camera.y = clamp(camera.y, halfViewH, CONFIG.MAP_HEIGHT - halfViewH);
  }
}

// =============================================================================
// UPDATE
// =============================================================================

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

// =============================================================================
// RENDERING
// =============================================================================

function render() {
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
function drawRangeCircle(drawCtx, x, y, range, valid = true) {
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

// =============================================================================
// GAME LOOP
// =============================================================================

function gameLoop(timestamp) {
  const dt = state.lastFrameTime
    ? Math.min((timestamp - state.lastFrameTime) / 1000, 0.1)
    : 0;
  state.lastFrameTime = timestamp;

  updateCamera(dt);
  updateEnemies(dt);

  if (isCombatPhase()) {
    updateWaveManager(dt);
    updateTowers(dt);
    updateProjectiles(dt);
    cleanupCombatEntities();
  }

  render();

  requestAnimationFrame(gameLoop);
}

// =============================================================================
// UTILITIES
// =============================================================================

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// =============================================================================
// BOOT
// =============================================================================

init();
