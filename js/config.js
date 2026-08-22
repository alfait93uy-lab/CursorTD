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
  // `tier` (1-4) is referenced by Marksman's talent tree: Execute targets
  // tier 1-2 mobs, Elite Damage targets tier 3-4 mobs. Assigned by relative
  // toughness (basic/scout are the weak early-wave mobs, tough/elite are
  // the late-wave threats).
  ENEMY_TYPES: {
    basic: {
      id: "basic",
      tier: 1,
      monsterValue: 10,
      hp: 100,
      speed: 140,
      xpReward: 3,
      fortDamage: 5,
      color: "#e74c3c",
    },
    scout: {
      id: "scout",
      tier: 2,
      monsterValue: 8,
      hp: 60,
      speed: 220,
      xpReward: 3,
      fortDamage: 3,
      color: "#f1c40f",
    },
    tough: {
      id: "tough",
      tier: 3,
      monsterValue: 25,
      hp: 200,
      speed: 110,
      xpReward: 12,
      fortDamage: 10,
      color: "#8e44ad",
    },
    elite: {
      id: "elite",
      tier: 4,
      monsterValue: 60,
      hp: 450,
      speed: 85,
      xpReward: 30,
      fortDamage: 25,
      color: "#2ecc71",
    },
  },

  /**
 * Wave definitions — each wave has a Monster Value budget, a spawn `period`
 * (total seconds the wave's enemies spawn across), and how many spawn
 * points to cycle through (`activeSpawnPoints`).
 *
 * Groups: { type, count, packSize? } — enemies spread evenly across the
 * wave's period. `packSize` spawns that many enemies together per "pack"
 * (e.g. count 9, packSize 3 → 3 packs of 3, spaced evenly across period).
 * All groups in a wave interleave (mix together) rather than playing one
 * group after another. Escape hatch: a group can set `interval` instead,
 * for a fixed spawn gap that ignores the wave's period.
 *
 * Monster Value = sum of (enemy.monsterValue × count) per group.
 * Values: basic (10), scout (8), tough (25), elite (60)
 */
  WAVES: [
  {
    number: 1,
    monsterValue: 30, // 3 * 10
    period: 3,
    activeSpawnPoints: 1,
    groups: [
      { type: "basic", count: 3 },
    ],
  },
  {
    number: 2,
    monsterValue: 64, // (4 * 10) + (3 * 8)
    period: 4,
    activeSpawnPoints: 1,
    groups: [
      { type: "basic", count: 4 },
      { type: "scout", count: 3, packSize: 3 },
    ],
  },
  {
    number: 3,
    monsterValue: 110, // (7 * 10) + (5 * 8)
    period: 5,
    activeSpawnPoints: 2,
    groups: [
      { type: "basic", count: 7 },
      { type: "scout", count: 5, packSize: 3 },
    ],
  },
  {
    number: 4,
    monsterValue: 160, // (8 * 10) + (10 * 8)
    period: 6,
    activeSpawnPoints: 2,
    groups: [
      { type: "basic", count: 8 },
      { type: "scout", count: 10, packSize: 3 },
    ],
  },
  {
    number: 5,
    monsterValue: 220, // (7 * 10) + (5 * 8) + (4 * 25)
    period: 7,
    activeSpawnPoints: 3,
    groups: [
      { type: "basic", count: 7 },
      { type: "scout", count: 5, packSize: 3 },
      { type: "tough", count: 4 },
    ],
  },
  {
    number: 6,
    monsterValue: 290, // (9 * 10) + (10 * 8) + (4 * 25)
    period: 8,
    activeSpawnPoints: 3,
    groups: [
      { type: "basic", count: 9 },
      { type: "scout", count: 10, packSize: 3 },
      { type: "tough", count: 4 },
    ],
  },
  {
    number: 7,
    monsterValue: 370, // (12 * 10) + (10 * 8) + (7 * 25)
    period: 9,
    activeSpawnPoints: 3,
    groups: [
      { type: "basic", count: 12 },
      { type: "scout", count: 10, packSize: 3 },
      { type: "tough", count: 7 },
    ],
  },
  {
    number: 8,
    monsterValue: 460, // (10 * 10) + (10 * 8) + (4 * 25) + (3 * 60)
    period: 10,
    activeSpawnPoints: 3,
    groups: [
      { type: "basic", count: 10 },
      { type: "scout", count: 10, packSize: 3 },
      { type: "tough", count: 4 },
      { type: "elite", count: 3 },
    ],
  },
  {
    number: 9,
    monsterValue: 560, // (12 * 10) + (15 * 8) + (6 * 25) + (3 * 60)
    period: 11,
    activeSpawnPoints: 3,
    groups: [
      { type: "basic", count: 12 },
      { type: "scout", count: 15, packSize: 3 },
      { type: "tough", count: 6 },
      { type: "elite", count: 3 },
    ],
  },
  {
    number: 10,
    monsterValue: 680, // (15 * 10) + (20 * 8) + (8 * 25) + (3 * 60)
    period: 12,
    activeSpawnPoints: 3,
    groups: [
      { type: "basic", count: 15 },
      { type: "scout", count: 20, packSize: 3 },
      { type: "tough", count: 8 },
      { type: "elite", count: 3 },
    ],
  },
  // Waves 11-20 (Aug 22): continues the same accelerating monsterValue
  // curve as 1-10 by feel, not a strict formula — activeSpawnPoints stays
  // at 3 (only 3 of the 5 SPAWN_POINTS slots are populated right now, see
  // above). Not yet play-tested; tune counts/period directly.
  {
    number: 11,
    monsterValue: 800, // (15*10) + (20*8) + (10*25) + (4*60)
    period: 13,
    activeSpawnPoints: 3,
    groups: [
      { type: "basic", count: 15 },
      { type: "scout", count: 20, packSize: 3 },
      { type: "tough", count: 10 },
      { type: "elite", count: 4 },
    ],
  },
  {
    number: 12,
    monsterValue: 956, // (18*10) + (22*8) + (12*25) + (5*60)
    period: 14,
    activeSpawnPoints: 3,
    groups: [
      { type: "basic", count: 18 },
      { type: "scout", count: 22, packSize: 3 },
      { type: "tough", count: 12 },
      { type: "elite", count: 5 },
    ],
  },
  {
    number: 13,
    monsterValue: 1110, // (20*10) + (25*8) + (14*25) + (6*60)
    period: 15,
    activeSpawnPoints: 3,
    groups: [
      { type: "basic", count: 20 },
      { type: "scout", count: 25, packSize: 3 },
      { type: "tough", count: 14 },
      { type: "elite", count: 6 },
    ],
  },
  {
    number: 14,
    monsterValue: 1314, // (22*10) + (28*8) + (18*25) + (7*60)
    period: 16,
    activeSpawnPoints: 3,
    groups: [
      { type: "basic", count: 22 },
      { type: "scout", count: 28, packSize: 3 },
      { type: "tough", count: 18 },
      { type: "elite", count: 7 },
    ],
  },
  {
    number: 15,
    monsterValue: 1540, // (25*10) + (30*8) + (18*25) + (10*60)
    period: 17,
    activeSpawnPoints: 3,
    groups: [
      { type: "basic", count: 25 },
      { type: "scout", count: 30, packSize: 3 },
      { type: "tough", count: 18 },
      { type: "elite", count: 10 },
    ],
  },
  {
    number: 16,
    monsterValue: 1716, // (30*10) + (32*8) + (20*25) + (11*60)
    period: 18,
    activeSpawnPoints: 3,
    groups: [
      { type: "basic", count: 30 },
      { type: "scout", count: 32, packSize: 3 },
      { type: "tough", count: 20 },
      { type: "elite", count: 11 },
    ],
  },
  {
    number: 17,
    monsterValue: 2030, // (30*10) + (35*8) + (22*25) + (15*60)
    period: 19,
    activeSpawnPoints: 3,
    groups: [
      { type: "basic", count: 30 },
      { type: "scout", count: 35, packSize: 3 },
      { type: "tough", count: 22 },
      { type: "elite", count: 15 },
    ],
  },
  {
    number: 18,
    monsterValue: 2239, // (35*10) + (38*8) + (25*25) + (16*60)
    period: 20,
    activeSpawnPoints: 3,
    groups: [
      { type: "basic", count: 35 },
      { type: "scout", count: 38, packSize: 3 },
      { type: "tough", count: 25 },
      { type: "elite", count: 16 },
    ],
  },
  {
    number: 19,
    monsterValue: 2620, // (35*10) + (40*8) + (30*25) + (20*60)
    period: 21,
    activeSpawnPoints: 3,
    groups: [
      { type: "basic", count: 35 },
      { type: "scout", count: 40, packSize: 3 },
      { type: "tough", count: 30 },
      { type: "elite", count: 20 },
    ],
  },
  {
    number: 20,
    monsterValue: 3060, // (40*10) + (45*8) + (32*25) + (25*60)
    period: 22,
    activeSpawnPoints: 3,
    groups: [
      { type: "basic", count: 40 },
      { type: "scout", count: 45, packSize: 3 },
      { type: "tough", count: 32 },
      { type: "elite", count: 25 },
    ],
  },
  ],

  MAX_SPAWN_POINTS: 5,
  SPAWN_POINTS: [
    { col: 2, row: 10 },
    { col: 2, row: 12 },
    { col: 2, row: 11 },
    { col: 2, row: 13 },
    { col: 2, row: 14 },
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
      maxCount: 0, // base cap — fully driven by the talent tree's Root node (see CONFIG.TALENT_TREES.slayer)
      radius: 28,
      range: 200,
      damage: 50,
      attackSpeed: 0.5,
      attackType: "cone",
      coneAngle: (Math.PI * 2) / 3, // 120° wide cone
      color: "#e74c3c",
    },
    // Melee, directional attack — narrow cone but longer range than Slayer.
    // Ranged — fires a straight arrow in a randomized direction within its
    // facing cone (not homed to one exact enemy), pierces every enemy it
    // passes through until it leaves range.
    spearman: {
      id: "spearman",
      label: "Spearman",
      maxCount: 0, // base cap — fully driven by the talent tree's Root node (see CONFIG.TALENT_TREES.spearman)
      radius: 28,
      range: 356,
      damage: 16,
      attackSpeed: 1.2,
      attackType: "directionalProjectile",
      coneAngle: Math.PI / 10, // 30° spread — each shot's direction is randomized within this
      pierce: Infinity,
      projectileSpeed: 700,
      projectileColor: "#2ecc71",
      color: "#2ecc71",
    },
    // Melee, circular AoE around itself — no direction needed.
    striker: {
      id: "striker",
      label: "Striker",
      maxCount: 0, // base cap — fully driven by the talent tree's Root node (see CONFIG.TALENT_TREES.striker)
      radius: 26,
      range: 180,
      damage: 10,
      attackSpeed: 2.0,
      attackType: "aoe",
      color: "#e67e22",
    },
    // Ranged — targets the enemy closest to the Fort (not closest to itself).
    marksman: {
      id: "marksman",
      label: "Marksman",
      maxCount: 0, // base cap — fully driven by the talent tree's Root node (see CONFIG.TALENT_TREES.marksman)
      radius: 26,
      range: 450,
      damage: 23,
      attackSpeed: 1.0,
      attackType: "targeted",
      pierce: 1, // homing shot, dies on its first hit — a future talent can raise this
      projectileSpeed: 850,
      projectileColor: "#3498db",
      color: "#3498db",
    },
  },
};

CONFIG.MAP_WIDTH = CONFIG.MAP_COLS * CONFIG.TILE_SIZE;
CONFIG.MAP_HEIGHT = CONFIG.MAP_ROWS * CONFIG.TILE_SIZE;

// =============================================================================
// TALENT TREE TUNING — every number that shapes how talent trees play.
// Change values here; nothing else needs touching for a pure numbers tweak.
// =============================================================================

// Default XP cost per point, for any node that doesn't set its own `cost`/`costs`.
CONFIG.TALENT_POINT_COST = 10;

// A tier unlocks the next one once TOTAL points spent in it (across all its
// nodes) reaches this. Applies uniformly to every tier→next-tier gate.
CONFIG.TALENT_TIER_UNLOCK_THRESHOLD = 5;

// Root gate (tier 0) is a special case — just needs this many points spent
// (out of its 3) to open tier 1.
CONFIG.TALENT_ROOT_UNLOCK_THRESHOLD = 1;

// Marksman "Bonus Arrow" talent: delay (seconds) before an extra arrow
// fires after the triggering shot.
CONFIG.BONUS_ARROW_DELAY = 0.1;

// Crit damage before any "Crit Damage" talent points are spent (150%).
CONFIG.BASE_CRIT_DAMAGE_MULTIPLIER = 1.5;

// Safety floors so stacked talents can't break the math (near-0 attack
// interval, near-0 bleed duration).
CONFIG.MIN_ATTACK_INTERVAL = 0.05;
CONFIG.MIN_BLEED_DURATION = 1;

/**
 * --- Talent trees (per-tower deeper progression, spent from the same XP pool) ---
 *
 * Node shape:
 *   id, label, maxPoints
 *   cost: <number>            — flat XP per point (default: CONFIG.TALENT_POINT_COST)
 *   costs: [<number>, ...]    — OR an escalating cost per point (costs[0] = 1st point, etc.)
 *   requires: { nodeId, min } — OPTIONAL single-parent prerequisite: this many
 *                               points must be in that node (usually from the
 *                               tier above) before this node can be spent into.
 *   exclusiveGroup: "name"    — OPTIONAL: only one node sharing this tag (tree-wide)
 *                               can ever have points — picking one locks the rest.
 *   effect: { type, ... }     — OPTIONAL: how this node changes combat stats.
 *                               No `effect` = spendable but currently a no-op
 *                               (used for reserved/stub nodes). See
 *                               talent-effects.js for the full list of types.
 *
 * A tier unlocks once the PREVIOUS tier's own `unlock` rule is met (checked
 * against that tier's total points spent). Nodes within an unlocked tier are
 * further gated individually by their own `requires`/`exclusiveGroup`, if set.
 */
CONFIG.TALENT_TREES = {
  slayer: {
    tiers: [
      {
        id: "root",
        unlock: { type: "sum", threshold: CONFIG.TALENT_ROOT_UNLOCK_THRESHOLD },
        nodes: [
          {
            id: "root",
            label: "Slayer",
            maxPoints: 3,
            costs: [10, 20, 100],
            unlocksTower: true, // spending the first point IS the tower unlock — no separate purchase
            effect: { type: "towerCap", perPoint: 1 }, // each point = +1 max Slayer towers placeable
            desc: "Commit to the Slayer's talent path. Each point unlocks (1st) and allows placing (each) one more Slayer tower.",
          },
        ],
      },
      {
        id: "tier1",
        unlock: { type: "sum", threshold: CONFIG.TALENT_TIER_UNLOCK_THRESHOLD },
        nodes: [
          {
            id: "dmg1",
            label: "Damage",
            maxPoints: 5,
            cost: 10,
            effect: { type: "flatDamage", perPoint: 1 },
            desc: "+1 damage per point.",
          },
          {
            id: "aoe",
            label: "Area of Effect",
            maxPoints: 3,
            cost: 10,
            effect: { type: "flatRange", perPoint: 20 },
            desc: "+20 attack range per point.",
          },
          {
            id: "atkspd",
            label: "Attack Speed",
            maxPoints: 2,
            cost: 10,
            // ASSUMPTION: the spec listed 3 reduction values (-0.3/-0.2/-0.1) but
            // capped this node at 2 points — using the first two. Add a third
            // entry (and bump maxPoints to 3) if a 3rd level was intended.
            effect: { type: "attackInterval", perLevelReduction: [0.3, 0.2] },
            desc: "-0.3s / -0.2s attack interval per level.",
          },
        ],
      },
      {
        id: "tier2",
        unlock: { type: "sum", threshold: CONFIG.TALENT_TIER_UNLOCK_THRESHOLD },
        nodes: [
          {
            id: "bleed",
            label: "Bleeding",
            maxPoints: 3,
            costs: [20, 30, 40],
            exclusiveGroup: "special",
            // ASSUMPTION: spec gave +30%/+20%/+20% (totals 30/50/70% over 3/4/5s)
            // but then asked for max level to land on 100%/5s so DPS keeps
            // climbing each level instead of flattening. Implemented as total
            // (not incremental) % per level: 30% (10%/s) -> 50% (12.5%/s) ->
            // 100% (20%/s). Tune the `percent` values below directly.
            effect: {
              type: "bleed",
              levels: [
                { percent: 30, duration: 3 },
                { percent: 50, duration: 4 },
                { percent: 100, duration: 5 },
              ],
            },
            desc: "On-hit bleed: 30% / 50% / 100% of hit damage over 3s / 4s / 5s.",
          },
          {
            id: "raoe",
            label: "Radial AoE",
            maxPoints: 3,
            // ASSUMPTION: cost not specified — mirrored Bleeding's cost since
            // they're the two exclusive picks in this tier.
            costs: [20, 30, 40],
            exclusiveGroup: "special",
            // Widens Slayer's cone toward a full 360°, 1/3 of the remaining
            // angle per point — computed from the base cone so it always
            // reaches exactly 360° at max, even if the base cone changes.
            effect: {
              type: "coneAngle",
              perPoint: (Math.PI * 2 - CONFIG.TOWER_TYPES.slayer.coneAngle) / 3,
            },
            desc: "Widens the attack cone toward a full 360° circle.",
          },
          {
            id: "dmg2",
            label: "Damage",
            maxPoints: 5,
            cost: 10,
            effect: { type: "flatDamage", perPoint: 1 },
            desc: "+1 damage per point.",
          },
        ],
      },
      {
        id: "tier3",
        unlock: { type: "sum", threshold: CONFIG.TALENT_TIER_UNLOCK_THRESHOLD },
        nodes: [
          {
            id: "deepwounds",
            label: "Deep Wounds",
            maxPoints: 2,
            cost: 20,
            requires: { nodeId: "bleed", min: 1 },
            effect: { type: "bleedDurationReduction", perPoint: 1 },
            desc: "-1s total bleed duration per point (same total damage).",
          },
          {
            id: "raoe_range",
            label: "Radial Range",
            maxPoints: 2,
            cost: 20,
            requires: { nodeId: "raoe", min: 1 },
            effect: { type: "flatRange", perPoint: 30 },
            desc: "+30 attack range per point.",
          },
          {
            id: "dmg3",
            label: "Damage",
            maxPoints: 5,
            cost: 10,
            effect: { type: "flatDamage", perPoint: 1 },
            desc: "+1 damage per point.",
          },
        ],
      },
      {
        id: "tier4",
        unlock: { type: "sum", threshold: CONFIG.TALENT_TIER_UNLOCK_THRESHOLD },
        nodes: [
          {
            id: "critchance",
            label: "Crit Chance",
            maxPoints: 5,
            cost: 20,
            effect: { type: "critChance", perLevel: [15, 10, 5, 5, 5] },
            desc: "+15/+10/+5/+5/+5% crit chance per level. Crits deal 150% damage (base).",
          },
          {
            id: "bleed_plus",
            label: "Bleeding+",
            maxPoints: 1,
            // TBD: reserved slot, no effect defined yet — placeholder cost.
            cost: 10,
            requires: { nodeId: "bleed", min: 1 },
            desc: "Reserved — effect not designed yet.",
          },
          {
            id: "raoe_plus",
            label: "Radial AoE+",
            maxPoints: 1,
            // TBD: reserved slot, no effect defined yet — placeholder cost.
            cost: 10,
            requires: { nodeId: "raoe", min: 1 },
            desc: "Reserved — effect not designed yet.",
          },
        ],
      },
      {
        id: "tier5",
        unlock: null, // last tier
        nodes: [
          {
            id: "critdamage",
            label: "Crit Damage",
            maxPoints: 2,
            cost: 30,
            requires: { nodeId: "critchance", min: 1 },
            effect: { type: "critDamage", perLevel: [30, 20] },
            desc: "+30% / +20% crit damage per level (on top of the 150% base).",
          },
        ],
      },
    ],
  },
  /**
   * Marksman's Root node (like Slayer's) gates placement — its first point
   * IS the unlock, base maxCount is 0 until then. Unlike Slayer it opens
   * straight into 3 parallel branches at tier1 rather than one, once the
   * root's unlock threshold (CONFIG.TALENT_ROOT_UNLOCK_THRESHOLD) is met.
   * tier1's `unlock` gates tier2 (5 points spent in tier1), tier2 gates
   * tier3 (5 more, 10 total), tier3 gates tier4 (5 more, 15 total) — same
   * uniform threshold as every other tree, chained tier-to-tier (see
   * talents.js header comment).
   *
   * NUMBERS BELOW ARE ASSUMPTIONS — the spec gave node names/branching but
   * no magnitudes. Flagged per-node; tune directly once play-tested.
   */
  marksman: {
    tiers: [
      {
        id: "root",
        unlock: { type: "sum", threshold: CONFIG.TALENT_ROOT_UNLOCK_THRESHOLD },
        nodes: [
          {
            id: "root",
            label: "Marksman",
            maxPoints: 3,
            costs: [10, 20, 100],
            unlocksTower: true, // spending the first point IS the tower unlock — no separate purchase
            effect: { type: "towerCap", perPoint: 1 }, // each point = +1 max Marksman towers placeable
            desc: "Commit to the Marksman's talent path. Each point unlocks (1st) and allows placing (each) one more Marksman tower.",
          },
        ],
      },
      {
        id: "tier1",
        unlock: { type: "sum", threshold: CONFIG.TALENT_TIER_UNLOCK_THRESHOLD },
        nodes: [
          {
            id: "projspeed",
            label: "Projectile Speed",
            maxPoints: 3,
            cost: 10,
            // ASSUMPTION: +100 projectile speed per point (base 850, max 1150).
            effect: { type: "projectileSpeed", perPoint: 100 },
            desc: "+100 projectile speed per point.",
          },
          {
            id: "damage1",
            label: "Damage",
            maxPoints: 5,
            cost: 10,
            effect: { type: "flatDamage", perPoint: 3 },
            desc: "+3 damage per point.",
          },
          {
            id: "aspeed1",
            label: "A.Speed",
            maxPoints: 3,
            cost: 10,
            // ASSUMPTION: -0.1s attack interval per point (base 1s, max 0.7s).
            effect: { type: "attackInterval", perLevelReduction: [0.1, 0.1, 0.1] },
            desc: "-0.1s attack interval per point.",
          },
        ],
      },
      {
        id: "tier2",
        unlock: { type: "sum", threshold: CONFIG.TALENT_TIER_UNLOCK_THRESHOLD },
        nodes: [
          {
            id: "longbow",
            label: "Longbow",
            maxPoints: 3,
            cost: 15,
            requires: { nodeId: "projspeed", min: 1 },
            // ASSUMPTION: +40 attack range per point (base 450, max 570).
            effect: { type: "flatRange", perPoint: 40 },
            desc: "+40 attack range per point.",
          },
          {
            id: "aspeed2",
            label: "A.Speed",
            maxPoints: 5,
            cost: 15,
            requires: { nodeId: "damage1", min: 1 },
            // ASSUMPTION: -0.05s attack interval per point (max additional -0.25s).
            effect: { type: "attackInterval", perLevelReduction: [0.05, 0.05, 0.05, 0.05, 0.05] },
            desc: "-0.05s attack interval per point.",
          },
          {
            id: "recurvebow",
            label: "Recurve Bow",
            maxPoints: 3,
            cost: 15,
            requires: { nodeId: "aspeed1", min: 1 },
            // ASSUMPTION: -0.05s attack interval per point (max additional -0.15s).
            effect: { type: "attackInterval", perLevelReduction: [0.05, 0.05, 0.05] },
            desc: "-0.05s attack interval per point.",
          },
        ],
      },
      {
        id: "tier3",
        unlock: { type: "sum", threshold: CONFIG.TALENT_TIER_UNLOCK_THRESHOLD },
        nodes: [
          {
            id: "elitedamage",
            label: "Elite Damage",
            maxPoints: 3,
            cost: 20,
            requires: { nodeId: "longbow", min: 1 },
            // ASSUMPTION: +10% damage per point vs tier 3-4 mobs (max +30%).
            effect: { type: "damageVsTier", tiers: [3, 4], perPoint: 0.1 },
            desc: "+10% damage per point against tough/elite mobs.",
          },
          {
            id: "critchance",
            label: "Crit %",
            maxPoints: 5,
            cost: 20,
            requires: { nodeId: "aspeed2", min: 1 },
            // ASSUMPTION: mirrors Slayer's crit curve shape, tuned down slightly.
            effect: { type: "critChance", perLevel: [10, 8, 7, 5, 5] },
            desc: "+10/+8/+7/+5/+5% crit chance per level.",
          },
          {
            id: "bonusarrowchance",
            label: "Bonus Arrow",
            maxPoints: 3,
            cost: 20,
            requires: { nodeId: "recurvebow", min: 1 },
            // ASSUMPTION: +10% chance per point (max 30%) to also fire an
            // extra arrow CONFIG.BONUS_ARROW_DELAY later at a random mob in range.
            effect: { type: "bonusArrowChance", perPoint: 0.1 },
            desc: "+10% chance per point to fire an additional arrow (0.1s delay) at a random mob in range.",
          },
        ],
      },
      {
        id: "tier4",
        unlock: null, // last tier
        nodes: [
          {
            id: "execute",
            label: "Execute",
            maxPoints: 2,
            cost: 30,
            requires: { nodeId: "elitedamage", min: 1 },
            // ASSUMPTION: +15% chance per point to one-shot tier 1-2 mobs (max 30%).
            effect: { type: "execute", tiers: [1, 2], perPoint: 0.15 },
            desc: "+15% chance per point to instantly kill basic/scout mobs on hit.",
          },
          {
            id: "critdamage",
            label: "Crit Damage",
            maxPoints: 2,
            cost: 30,
            requires: { nodeId: "critchance", min: 1 },
            effect: { type: "critDamage", perLevel: [30, 20] },
            desc: "+30% / +20% crit damage per level (on top of the 150% base).",
          },
          {
            id: "bonusarrowcount",
            label: "Additional Arrow Count",
            maxPoints: 2,
            cost: 30,
            requires: { nodeId: "bonusarrowchance", min: 1 },
            // ASSUMPTION: +1 extra arrow per point when the Bonus Arrow chance
            // triggers (base 1 extra arrow, max 3 total on a proc).
            effect: { type: "bonusArrowCount", perPoint: 1 },
            desc: "+1 additional arrow per point whenever Bonus Arrow triggers.",
          },
        ],
      },
    ],
  },
  /**
   * Spearman: no per-node `requires` chains at all (per the user, unlike
   * Slayer/Marksman) — every node is gated purely by its tier's point
   * threshold (5/10/15 total, same chained-tier mechanism as every other
   * tree). T1 has 3 nodes but T2/T3 only 2 (Attack Speed, Crit% — Damage
   * and Attack Range are single-tier, T1-only boosts, nothing beyond).
   * T4 is a mutually-exclusive choice of 1, via the existing
   * `exclusiveGroup` mechanism (same pattern as Slayer's tier4 stub nodes).
   *
   * NUMBERS BELOW ARE ASSUMPTIONS — the spec gave node names/branching but
   * no magnitudes (except the two explicit "0/5"s). Flagged per-node; tune
   * directly once play-tested.
   */
  spearman: {
    tiers: [
      {
        id: "root",
        unlock: { type: "sum", threshold: CONFIG.TALENT_ROOT_UNLOCK_THRESHOLD },
        nodes: [
          {
            id: "root",
            label: "Spearman",
            maxPoints: 3,
            costs: [10, 20, 100],
            unlocksTower: true,
            effect: { type: "towerCap", perPoint: 1 },
            desc: "Commit to the Spearman's talent path. Each point unlocks (1st) and allows placing (each) one more Spearman tower.",
          },
        ],
      },
      {
        id: "tier1",
        unlock: { type: "sum", threshold: CONFIG.TALENT_TIER_UNLOCK_THRESHOLD },
        nodes: [
          {
            id: "damage1",
            label: "Damage",
            maxPoints: 5,
            cost: 10,
            effect: { type: "flatDamage", perPoint: 3 },
            desc: "+3 damage per point.",
          },
          {
            id: "range1",
            label: "Attack Range",
            maxPoints: 3,
            cost: 10,
            // T1-only — doesn't continue past tier1, unlike Damage/A.Speed.
            effect: { type: "flatRange", perPoint: 40 },
            desc: "+40 attack range per point.",
          },
          {
            id: "aspeed1",
            label: "Attack Speed",
            maxPoints: 3,
            cost: 10,
            effect: { type: "attackInterval", perLevelReduction: [0.05, 0.05, 0.05] },
            desc: "-0.05s attack interval per point.",
          },
        ],
      },
      {
        id: "tier2",
        unlock: { type: "sum", threshold: CONFIG.TALENT_TIER_UNLOCK_THRESHOLD },
        nodes: [
          {
            id: "aspeed2",
            label: "Attack Speed",
            maxPoints: 5,
            cost: 15,
            effect: { type: "attackInterval", perLevelReduction: [0.04, 0.04, 0.04, 0.04, 0.04] },
            desc: "-0.04s attack interval per point.",
          },
          {
            id: "critchance2",
            label: "Crit %",
            maxPoints: 5,
            cost: 15,
            effect: { type: "critChance", perLevel: [8, 7, 6, 5, 4] },
            desc: "+8/+7/+6/+5/+4% crit chance per level.",
          },
        ],
      },
      {
        id: "tier3",
        unlock: { type: "sum", threshold: CONFIG.TALENT_TIER_UNLOCK_THRESHOLD },
        nodes: [
          {
            id: "aspeed3",
            label: "Attack Speed",
            maxPoints: 5,
            cost: 20,
            effect: { type: "attackInterval", perLevelReduction: [0.03, 0.03, 0.03, 0.03, 0.03] },
            desc: "-0.03s attack interval per point.",
          },
          {
            id: "critchance3",
            label: "Crit %",
            maxPoints: 5,
            cost: 20,
            effect: { type: "critChance", perLevel: [6, 5, 5, 4, 4] },
            desc: "+6/+5/+5/+4/+4% crit chance per level.",
          },
        ],
      },
      {
        id: "tier4",
        unlock: null, // last tier
        nodes: [
          {
            id: "critdamage4",
            label: "Crit Damage",
            maxPoints: 1,
            cost: 30,
            exclusiveGroup: "spearman_t4",
            effect: { type: "critDamage", perLevel: [40] },
            desc: "+40% crit damage (on top of the 150% base). Choose one tier-4 talent.",
          },
          {
            id: "focusfire4",
            label: "Focus Fire",
            maxPoints: 1,
            cost: 30,
            exclusiveGroup: "spearman_t4",
            // ASSUMPTION: halves the cone spread (tighter, more concentrated shots).
            effect: { type: "coneAngleMultiplier", perPoint: -0.5 },
            desc: "Halves the attack cone's spread. Choose one tier-4 talent.",
          },
          {
            id: "extraattack4",
            label: "Extra Attack",
            maxPoints: 2,
            cost: 30,
            exclusiveGroup: "spearman_t4",
            // ASSUMPTION: +15% chance per point (max 30%) to also fire a 2nd
            // shot CONFIG.BONUS_ARROW_DELAY later, same cone/direction logic.
            effect: { type: "bonusArrowChance", perPoint: 0.15 },
            desc: "+15% chance per point to fire an additional attack (0.1s delay). Choose one tier-4 talent.",
          },
        ],
      },
    ],
  },
  /**
   * Striker: Root is a single point (0/1), not 3 like the other trees — per
   * the user. T2 introduces two new "every Nth connecting attack" procs
   * (Resonant Hammer: fixed interval, scaling magnitude/duration; Echo
   * Strike: scaling interval, fixed magnitude) — see periodicSlow /
   * periodicDoubleDamage in talent-effects.js and the attackCount tracking
   * in tower.js's meleeAttack. T3/T4 branch by `requires` off T2's two
   * nodes (Resonant Hammer branch, Echo Strike branch), same requires
   * mechanism as Slayer/Marksman.
   *
   * NUMBERS BELOW ARE ASSUMPTIONS — the spec gave node names/branching but
   * no magnitudes beyond Resonant/Echo's own explicit per-rank numbers.
   * Flagged per-node; tune directly once play-tested.
   */
  striker: {
    tiers: [
      {
        id: "root",
        unlock: { type: "sum", threshold: CONFIG.TALENT_ROOT_UNLOCK_THRESHOLD },
        nodes: [
          {
            id: "root",
            label: "Striker",
            maxPoints: 1,
            cost: 10,
            unlocksTower: true,
            effect: { type: "towerCap", perPoint: 1 },
            desc: "Unlocks the Striker tower.",
          },
        ],
      },
      {
        id: "tier1",
        unlock: { type: "sum", threshold: CONFIG.TALENT_TIER_UNLOCK_THRESHOLD },
        nodes: [
          {
            id: "aspeed1",
            label: "Attack Speed",
            maxPoints: 5,
            cost: 10,
            effect: { type: "attackInterval", perLevelReduction: [0.03, 0.03, 0.03, 0.03, 0.03] },
            desc: "-0.03s attack interval per point.",
          },
          {
            id: "damage1",
            label: "Damage",
            maxPoints: 5,
            cost: 10,
            effect: { type: "flatDamage", perPoint: 2 },
            desc: "+2 damage per point.",
          },
        ],
      },
      {
        id: "tier2",
        unlock: { type: "sum", threshold: CONFIG.TALENT_TIER_UNLOCK_THRESHOLD },
        nodes: [
          {
            id: "resonanthammer",
            label: "Resonant Hammer",
            maxPoints: 3,
            cost: 15,
            // Fixed every-4th-attack interval; only slow%/duration scale with rank.
            effect: {
              type: "periodicSlow",
              interval: 4,
              perLevel: [
                { percent: 10, duration: 1 },
                { percent: 20, duration: 2 },
                { percent: 30, duration: 3 },
              ],
            },
            desc: "Every 4th connecting attack slows every enemy hit: 10%/1s, 20%/2s, 30%/3s per level.",
          },
          {
            id: "echostrike",
            label: "Echo Strike",
            maxPoints: 3,
            cost: 15,
            // Fixed double-damage magnitude; the trigger interval itself shortens with rank.
            effect: { type: "periodicDoubleDamage", perLevel: [5, 4, 3] },
            desc: "Every 5th/4th/3rd connecting attack (by level) deals double damage to every enemy hit.",
          },
        ],
      },
      {
        id: "tier3",
        unlock: { type: "sum", threshold: CONFIG.TALENT_TIER_UNLOCK_THRESHOLD },
        nodes: [
          {
            id: "resonantaoe3",
            label: "AoE",
            maxPoints: 2,
            cost: 20,
            requires: { nodeId: "resonanthammer", min: 1 },
            // ASSUMPTION: "AoE" = bigger attack radius, since Striker's base
            // attack already hits everything in range each swing.
            effect: { type: "flatRange", perPoint: 25 },
            desc: "+25 attack range per point.",
          },
          {
            id: "echoaspeed3",
            label: "Attack Speed",
            maxPoints: 3,
            cost: 20,
            requires: { nodeId: "echostrike", min: 1 },
            effect: { type: "attackInterval", perLevelReduction: [0.02, 0.02, 0.02] },
            desc: "-0.02s attack interval per point.",
          },
        ],
      },
      {
        id: "tier4",
        unlock: null, // last tier
        nodes: [
          {
            id: "resonantcap4",
            label: "Striker",
            maxPoints: 1,
            cost: 30,
            requires: { nodeId: "resonantaoe3", min: 1 },
            // A 2nd copy of the Root's unlock effect — raises the placement cap again.
            effect: { type: "towerCap", perPoint: 1 },
            desc: "+1 max Striker towers placeable.",
          },
          {
            id: "echoaoe4",
            label: "AoE",
            maxPoints: 2,
            cost: 30,
            requires: { nodeId: "echoaspeed3", min: 1 },
            effect: { type: "flatRange", perPoint: 25 },
            desc: "+25 attack range per point.",
          },
          {
            id: "echodamage4",
            label: "Damage",
            maxPoints: 3,
            cost: 30,
            requires: { nodeId: "echoaspeed3", min: 1 },
            effect: { type: "flatDamage", perPoint: 3 },
            desc: "+3 damage per point.",
          },
        ],
      },
    ],
  },
};

// --- Main Menu: map select ---
// designWaveCount is the spec target (10/map); actual playable wave count
// right now is CONFIG.WAVES.length (only Map 1 has real wave data so far).
// bgImage: per-map art file, falls back to CONFIG.BG_IMAGE_URL (placeholder)
// when omitted. defaultBlockedTiles: [col,row] pairs painted BLOCKED at map
// load — populate by using the in-game "Export Blocked Tiles" button (paints
// your obstacle layout, then copies a ready-to-paste array here).
CONFIG.MAPS = [
  {
    id: "map1",
    label: "Map 1",
    designWaveCount: 20, // Aug 22: was 10, bumped after adding waves 11-20
    requiresMapId: null,
    bgImage: "Map1.png",
    defaultBlockedTiles: [],
  },
  { id: "map2", label: "Map 2", designWaveCount: 10, requiresMapId: "map1", defaultBlockedTiles: [] },
  { id: "map3", label: "Map 3", designWaveCount: 10, requiresMapId: "map2", defaultBlockedTiles: [] },
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