/**
 * CONFIG.JS
 * Static, unchanging data: game phases, all tunable numbers, tile type enum.
 * Nothing in this file reads or writes game state — pure constants only.
 */

// =============================================================================
// GAME PHASE
// =============================================================================

export const GamePhase = {
  PLACEMENT: "placement",
  COMBAT: "combat",
};

// =============================================================================
// CONFIGURATION
// =============================================================================

export const CONFIG = {
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
      fortDamage: 5,
      color: "#e74c3c",
    },
    tough: {
      id: "tough",
      monsterValue: 25,
      hp: 200,
      speed: 110,
      xpReward: 12,
      fortDamage: 10,
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
  // --- Fort HP system ---
  FORT_MAX_HP: 30,
  FORT_WAVE_REGEN: 5,
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
    // Melee, cone-shaped attack in front of the tower. Wide angle, short-mid range.
    slayer: {
      id: "slayer",
      label: "Slayer",
      maxCount: 1, // base cap; skill tree can raise this later
      radius: 28,
      range: 200,
      damage: 22,
      attackSpeed: 0.9,
      attackType: "cone",
      coneAngle: (Math.PI * 2) / 3, // 120° wide cone
      color: "#e74c3c",
    },
    // Melee, directional attack — narrow cone but longer range than Slayer.
    spearman: {
      id: "spearman",
      label: "Spearman",
      maxCount: 1, // base cap; skill tree can raise this later
      radius: 28,
      range: 256,
      damage: 16,
      attackSpeed: 1.2,
      attackType: "directional",
      coneAngle: Math.PI / 6, // 30° narrow cone (thrust line)
      color: "#2ecc71",
    },
    // Melee, circular AoE around itself — no direction needed.
    striker: {
      id: "striker",
      label: "Striker",
      maxCount: 1, // base cap; skill tree can raise this later
      radius: 26,
      range: 220,
      damage: 12,
      attackSpeed: 2.0,
      attackType: "aoe",
      color: "#e67e22",
    },
    // Ranged — targets the enemy closest to the Fort (not closest to itself).
    marksman: {
      id: "marksman",
      label: "Marksman",
      maxCount: 1, // base cap; skill tree can raise this later
      radius: 26,
      range: 320,
      damage: 20,
      attackSpeed: 1.0,
      attackType: "targeted",
      projectileSpeed: 550,
      projectileColor: "#3498db",
      color: "#3498db",
    },
  },
};

CONFIG.MAP_WIDTH = CONFIG.MAP_COLS * CONFIG.TILE_SIZE;
CONFIG.MAP_HEIGHT = CONFIG.MAP_ROWS * CONFIG.TILE_SIZE;

// --- Main Menu: map select ---
// designWaveCount is the spec target (10/map); actual playable wave count
// right now is CONFIG.WAVES.length (only Map 1 has real wave data so far).
CONFIG.MAPS = [
  { id: "map1", label: "Map 1", designWaveCount: 10, requiresMapId: null },
  { id: "map2", label: "Map 2", designWaveCount: 10, requiresMapId: "map1" },
  { id: "map3", label: "Map 3", designWaveCount: 10, requiresMapId: "map2" },
];

// --- Main Menu: difficulty select (UI only for now — not yet applied to gameplay) ---
CONFIG.DIFFICULTIES = [
  { id: "normal", label: "Normal" },
  { id: "hard", label: "Hard" },
  { id: "veryhard", label: "Very Hard" },
];

// =============================================================================
// TILE TYPES
// =============================================================================

export const TILE = {
  WALKABLE: 0,
  BLOCKED: 1,
};
