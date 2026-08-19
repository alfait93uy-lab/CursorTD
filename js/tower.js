/**
 * TOWER.JS
 * Placeholder tower with combat stats + attack behavior driven by
 * CONFIG.TOWER_TYPES. Adding a new tower type (Outpost, Balista, ...) means:
 *   1. Add an entry to CONFIG.TOWER_TYPES (config.js) with an attackType
 *   2. If it's a new attackType, add a case to the switch in update()
 */

import { CONFIG } from "./config.js";
import { state } from "./state.js";
import { normalizeAngle, getFortWorldPos, worldToTile } from "./coords.js";
import { isCombatPhase } from "./game-phase.js";
import { Projectile } from "./projectile.js";
import { drawRangeCircle, drawConeIndicator, drawRotationHandle } from "./render.js";

export class Tower {
  constructor(typeId, x, y) {
    this.typeId = typeId;
    this.def = CONFIG.TOWER_TYPES[typeId];
    this.x = x;
    this.y = y;
    this.attackCooldown = 0;

    // --- Phase 8: facing direction (radians). Only used by cone/directional towers,
    // but harmless to keep on every tower. Default: facing "up" (north). ---
    this.angle = -Math.PI / 2;

    // Brief visual flash timer for melee attacks (cone/directional/aoe), since
    // those deal damage instantly instead of firing a projectile.
    this.attackFlashTimer = 0;
    this.attackFlashDuration = 0.15;
  }

  /** @returns {boolean} True if this tower type aims (rotatable cone/directional). */
  isDirectional() {
    return this.def.attackType === "cone" || this.def.attackType === "directional";
  }

  /** @param {number} dt */
  update(dt) {
    if (!isCombatPhase()) return;

    if (this.attackFlashTimer > 0) this.attackFlashTimer -= dt;

    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt;
      return; // still on cooldown, no point searching for targets
    }

    switch (this.def.attackType) {
      case "targeted": {
        // Marksman: ranged straight projectile at the enemy closest to the Fort.
        const target = this.findClosestToFortInRange();
        if (target) this.fireAt(target);
        break;
      }
      case "aoe": {
        // Striker: instant damage to every enemy in range around itself.
        // Always swings on cooldown — hits nothing if no enemy is in range.
        const targets = this.getEnemiesInRange();
        this.meleeAttack(targets);
        break;
      }
      case "cone":
      case "directional": {
        // Slayer / Spearman: instant damage to every enemy inside the facing cone.
        // Always swings on cooldown — hits nothing if no enemy is in the cone.
        const targets = this.getEnemiesInCone();
        this.meleeAttack(targets);
        break;
      }
    }
  }

  /** All living enemies within range (no angle restriction). */
  getEnemiesInRange() {
    const result = [];
    for (const enemy of state.enemies) {
      if (!enemy.isAlive()) continue;
      if (Math.hypot(enemy.x - this.x, enemy.y - this.y) <= this.def.range) {
        result.push(enemy);
      }
    }
    return result;
  }

  /** Living enemies within range AND inside the facing cone (coneAngle wide). */
  getEnemiesInCone() {
    const halfAngle = this.def.coneAngle / 2;
    const result = [];

    for (const enemy of state.enemies) {
      if (!enemy.isAlive()) continue;

      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > this.def.range) continue;

      const angleToEnemy = Math.atan2(dy, dx);
      const diff = normalizeAngle(angleToEnemy - this.angle);
      if (Math.abs(diff) <= halfAngle) {
        result.push(enemy);
      }
    }

    return result;
  }

  /** Nearest-to-Fort living enemy within range (Marksman targeting rule). */
  findClosestToFortInRange() {
    const fortPos = getFortWorldPos();
    let best = null;
    let bestFortDist = Infinity;

    for (const enemy of state.enemies) {
      if (!enemy.isAlive()) continue;
      if (Math.hypot(enemy.x - this.x, enemy.y - this.y) > this.def.range) continue;

      const fortDist = Math.hypot(enemy.x - fortPos.x, enemy.y - fortPos.y);
      if (fortDist < bestFortDist) {
        best = enemy;
        bestFortDist = fortDist;
      }
    }

    return best;
  }

  /** Instant melee hit on all given targets (cone/directional/aoe attacks). */
  meleeAttack(targets) {
    for (const enemy of targets) {
      enemy.takeDamage(this.def.damage);
    }
    this.attackCooldown = 1 / this.def.attackSpeed;
    this.attackFlashTimer = this.attackFlashDuration;
  }

  /** @param {Enemy} target Fires a homing projectile (ranged towers only). */
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
    this.attackCooldown = 1 / this.def.attackSpeed;
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

  /** @returns {boolean} True if a world point is inside the rotation handle. */
  containsRotationHandle(worldX, worldY) {
    if (!this.isDirectional()) return false;
    const handle = this.getRotationHandlePos();
    return Math.hypot(worldX - handle.x, worldY - handle.y) <= 12;
  }

  /** World position of the small drag handle used to aim this tower. */
  getRotationHandlePos() {
    const dist = this.def.radius + 22;
    return {
      x: this.x + Math.cos(this.angle) * dist,
      y: this.y + Math.sin(this.angle) * dist,
    };
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

    // Facing indicator for directional towers (small line pointing the aim direction)
    if (this.isDirectional() && !ghost) {
      drawCtx.strokeStyle = "#fff";
      drawCtx.lineWidth = 3 / state.camera.zoom;
      drawCtx.beginPath();
      drawCtx.moveTo(this.x, this.y);
      drawCtx.lineTo(
        this.x + Math.cos(this.angle) * (r + 12),
        this.y + Math.sin(this.angle) * (r + 12)
      );
      drawCtx.stroke();
    }

    // Brief white flash on melee hit (cone/directional/aoe placeholder "attack")
    if (this.attackFlashTimer > 0 && !ghost) {
      drawCtx.globalAlpha = this.attackFlashTimer / this.attackFlashDuration;
      drawCtx.strokeStyle = "#fff";
      drawCtx.lineWidth = 3 / state.camera.zoom;
      drawCtx.beginPath();
      drawCtx.arc(this.x, this.y, r * 1.5, 0, Math.PI * 2);
      drawCtx.stroke();
    }

    drawCtx.restore();
  }

  /**
   * Range indicator: full circle for aoe/targeted, a facing cone wedge for
   * cone/directional towers (drawn in addition to a faint full-range circle).
   * @param {CanvasRenderingContext2D} drawCtx
   * @param {boolean} [valid=true]
   */
  drawRange(drawCtx, valid = true) {
    drawRangeCircle(drawCtx, this.x, this.y, this.def.range, valid);

    if (this.isDirectional()) {
      drawConeIndicator(drawCtx, this.x, this.y, this.def.range, this.angle, this.def.coneAngle, valid);
      drawRotationHandle(drawCtx, this.getRotationHandlePos());
    }
  }
}
