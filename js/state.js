/**
 * STATE.JS
 * The single source of truth for everything that changes during play:
 * camera, tilemap, towers, enemies, projectiles, waves, XP, UI flags.
 * Other files import `state` and read/write it directly.
 */

import { CONFIG, GamePhase } from "./config.js";
import { createTilemap } from "./tilemap.js";

/** @type {HTMLCanvasElement} */
export const canvas = document.getElementById("game-canvas");

/** @type {CanvasRenderingContext2D} */
export const ctx = canvas.getContext("2d");

export const state = {
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
    /** Active drag session when rotating a selected directional tower ({ tower }) */
    rotateDrag: null,
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

  /** Fort health */
  fort: {
    hp: CONFIG.FORT_MAX_HP,
    maxHp: CONFIG.FORT_MAX_HP,
    destroyed: false,
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
