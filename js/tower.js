/**
 * TOWER.JS
 * Placeholder tower with combat stats + attack behavior driven by
 * CONFIG.TOWER_TYPES, modified live by spent talent points (see
 * talent-effects.js). Adding a new tower type (Outpost, Balista, ...) means:
 *   1. Add an entry to CONFIG.TOWER_TYPES (config.js) with an attackType
 *   2. If it's a new attackType, add a case to the switch in update()
 */

import { CONFIG } from "./config.js";
import { state } from "./state.js";
import { normalizeAngle, getFortWorldPos, worldToTile } from "./coords.js";
import { isCombatPhase } from "./game-phase.js";
import { Projectile } from "./projectile.js";
import { drawRangeCircle, drawConeIndicator, drawRotationHandle } from "./render.js";
import { getEffectiveTowerStats } from "./talent-effects.js";
import { applyBleed, applySlow } from "./status-effects.js";

/**
 * Ticks state.pendingShots (Marksman's delayed Bonus Arrow talent) and
 * fires any whose delay has elapsed. Call once per frame during combat,
 * alongside updateTowers/updateProjectiles.
 * @param {number} dt
 */
export function updatePendingShots(dt) {
  if (state.pendingShots.length === 0) return;

  const remaining = [];
  for (const shot of state.pendingShots) {
    shot.timer -= dt;
    if (shot.timer > 0) {
      remaining.push(shot);
      continue;
    }
    fireBonusArrow(shot.tower);
  }
  state.pendingShots = remaining;
}

/** Fires one delayed bonus arrow. Wasted (no shot) if nothing's in range anymore — homing towers only, cone towers always fire forward regardless of range. */
function fireBonusArrow(tower) {
  const stats = tower.getStats();

  if (tower.def.attackType === "directionalProjectile") {
    tower.fireDirectionalProjectile(stats, true);
    return;
  }

  const target = tower.findRandomInRange(stats);
  if (!target || !target.isAlive()) return;

  const dmg = tower.rollDamage(stats, target);
  state.projectiles.push(
    new Projectile({
      x: tower.x,
      y: tower.y,
      target,
      damage: dmg,
      speed: stats.projectileSpeed,
      color: tower.def.projectileColor,
      pierce: stats.pierce,
    })
  );
}

export class Tower {
  constructor(typeId, x, y) {
    this.typeId = typeId;
    this.def = CONFIG.TOWER_TYPES[typeId];
    this.x = x;
    this.y = y;
    this.attackCooldown = 0;
    this.attackCount = 0; // connecting attacks only (see meleeAttack) — Striker: Resonant Hammer / Echo Strike

    // --- Phase 8: facing direction (radians). Only used by cone/directional towers,
    // but harmless to keep on every tower. Default: facing "up" (north). ---
    this.angle = -Math.PI / 2;

    // Brief visual flash timer for melee attacks (cone/directional/aoe), since
    // those deal damage instantly instead of firing a projectile.
    this.attackFlashTimer = 0;
    this.attackFlashDuration = 0.2;
  }

  /**
   * Live combat stats (base def + spent talent points), recomputed on
   * demand rather than cached — talent points are only spent between
   * waves, so this is cheap and always correct.
   * @returns {{damage:number, range:number, attackInterval:number, coneAngle:number, critChance:number, critDamageMultiplier:number, bleed:object|null}}
   */
  getStats() {
    return getEffectiveTowerStats(this.typeId);
  }

  /** @returns {boolean} True if this tower type aims (rotatable cone/directional/directional-projectile). */
  isDirectional() {
    return (
      this.def.attackType === "cone" ||
      this.def.attackType === "directional" ||
      this.def.attackType === "directionalProjectile"
    );
  }

  /** @param {number} dt */
  update(dt) {
    if (!isCombatPhase()) return;

    if (this.attackFlashTimer > 0) this.attackFlashTimer -= dt;

    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt;
      return; // still on cooldown, no point searching for targets
    }

    const stats = this.getStats();

    switch (this.def.attackType) {
      case "targeted": {
        // Marksman: ranged straight projectile at the enemy closest to the Fort.
        const target = this.findClosestToFortInRange(stats);
        if (target) this.fireAt(target, stats);
        break;
      }
      case "aoe": {
        // Striker: instant damage to every enemy in range around itself.
        // Always swings on cooldown — hits nothing if no enemy is in range.
        const targets = this.getEnemiesInRange(stats);
        this.meleeAttack(targets, stats);
        break;
      }
      case "cone":
      case "directional": {
        // Slayer / Spearman: instant damage to every enemy inside the facing cone.
        // Always swings on cooldown — hits nothing if no enemy is in the cone.
        const targets = this.getEnemiesInCone(stats);
        this.meleeAttack(targets, stats);
        break;
      }
      case "directionalProjectile": {
        // Straight-line, piercing arrow. Always fires on cooldown, same as
        // the melee attack types — direction is randomized within the
        // facing cone each shot, and it can hit anything that crosses its
        // path as it travels, whether or not something was in the cone
        // at the moment it fired.
        this.fireDirectionalProjectile(stats);
        break;
      }
    }
  }

  /** All living enemies within range (no angle restriction). */
  getEnemiesInRange(stats = this.getStats()) {
    const result = [];
    for (const enemy of state.enemies) {
      if (!enemy.isAlive()) continue;
      if (Math.hypot(enemy.x - this.x, enemy.y - this.y) <= stats.range) {
        result.push(enemy);
      }
    }
    return result;
  }

  /** Living enemies within range AND inside the facing cone (coneAngle wide). */
  getEnemiesInCone(stats = this.getStats()) {
    const halfAngle = stats.coneAngle / 2;
    const result = [];

    for (const enemy of state.enemies) {
      if (!enemy.isAlive()) continue;

      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > stats.range) continue;

      const angleToEnemy = Math.atan2(dy, dx);
      const diff = normalizeAngle(angleToEnemy - this.angle);
      if (Math.abs(diff) <= halfAngle) {
        result.push(enemy);
      }
    }

    return result;
  }

  /** Nearest-to-Fort living enemy within range (Marksman targeting rule). */
  findClosestToFortInRange(stats = this.getStats()) {
    const fortPos = getFortWorldPos();
    let best = null;
    let bestFortDist = Infinity;

    for (const enemy of state.enemies) {
      if (!enemy.isAlive()) continue;
      if (Math.hypot(enemy.x - this.x, enemy.y - this.y) > stats.range) continue;

      const fortDist = Math.hypot(enemy.x - fortPos.x, enemy.y - fortPos.y);
      if (fortDist < bestFortDist) {
        best = enemy;
        bestFortDist = fortDist;
      }
    }

    return best;
  }

  /**
   * Roll a crit and return the damage to actually deal for one hit.
   * If a target is given, also applies target-tier-dependent effects
   * (Marksman: Elite Damage's vs-tier multiplier, Execute's instakill
   * chance) — harmless no-op for towers/nodes that don't set those stats.
   * @param {object} stats
   * @param {Enemy} [target]
   */
  rollDamage(stats, target = null) {
    const isCrit = Math.random() < stats.critChance;
    let dmg = isCrit ? stats.damage * stats.critDamageMultiplier : stats.damage;

    if (target) {
      const tier = CONFIG.ENEMY_TYPES[target.typeId]?.tier;

      if (stats.damageVsTier && stats.damageVsTier.tiers.includes(tier)) {
        dmg *= stats.damageVsTier.multiplier;
      }

      if (stats.executeChance > 0 && stats.executeTiers.includes(tier) && Math.random() < stats.executeChance) {
        dmg = target.hp; // guarantees a kill regardless of remaining HP
      }
    }

    return dmg;
  }

  /** Instant melee hit on all given targets (cone/directional/aoe attacks). */
  meleeAttack(targets, stats = this.getStats()) {
    // ASSUMPTION: "every Nth attack" counts connecting swings only (targets.length > 0)
    // — an aoe/cone swing that lands on nothing doesn't consume a proc.
    if (targets.length > 0) {
      this.attackCount++;
    }

    const resonantProcs = stats.resonantHammer && this.attackCount % stats.resonantHammer.interval === 0;
    const echoProcs = stats.echoStrike && this.attackCount % stats.echoStrike.interval === 0;

    for (const enemy of targets) {
      let dmg = this.rollDamage(stats, enemy);
      if (echoProcs) dmg *= 2;

      enemy.takeDamage(dmg);
      if (stats.bleed) {
        applyBleed(enemy, dmg * (stats.bleed.percent / 100), stats.bleed.duration);
      }
      if (resonantProcs) {
        applySlow(enemy, stats.resonantHammer.percent, stats.resonantHammer.duration);
      }
    }
    this.attackCooldown = stats.attackInterval;
    this.attackFlashTimer = this.attackFlashDuration;
  }

  /** @param {Enemy} target Fires a homing projectile (ranged towers only). */
  fireAt(target, stats = this.getStats()) {
    const dmg = this.rollDamage(stats, target);
    state.projectiles.push(
      new Projectile({
        x: this.x,
        y: this.y,
        target,
        damage: dmg,
        speed: stats.projectileSpeed,
        color: this.def.projectileColor,
        pierce: stats.pierce,
      })
    );
    this.attackCooldown = stats.attackInterval;
    this.maybeFireBonusArrows(stats);
  }

  /**
   * Marksman's Bonus Arrow talent: on a successful chance roll, queues
   * (1 + bonusArrowCount) extra shots that each fire CONFIG.BONUS_ARROW_DELAY
   * later at their own freshly-picked random in-range target (see
   * updatePendingShots below) — independent from the main shot just fired.
   */
  maybeFireBonusArrows(stats) {
    if (!stats.bonusArrowChance || Math.random() >= stats.bonusArrowChance) return;

    const extraCount = 1 + (stats.bonusArrowCount || 0);
    for (let i = 0; i < extraCount; i++) {
      state.pendingShots.push({ timer: CONFIG.BONUS_ARROW_DELAY, tower: this });
    }
  }

  /** A random living enemy within range, or null (used by delayed bonus arrows). */
  findRandomInRange(stats = this.getStats()) {
    const inRange = this.getEnemiesInRange(stats);
    if (inRange.length === 0) return null;
    return inRange[Math.floor(Math.random() * inRange.length)];
  }

  /**
   * Fires a straight, piercing arrow. Direction is randomized within the
   * facing cone each shot (not homed to a specific enemy) — see the
   * "directionalProjectile" case in update().
   * @param {boolean} isBonusShot Set by a delayed Extra Attack bonus shot
   *   (see fireBonusArrow below) — skips resetting the cooldown and skips
   *   rolling its own bonus-attack chance, so procs can't cascade.
   */
  fireDirectionalProjectile(stats = this.getStats(), isBonusShot = false) {
    const halfAngle = stats.coneAngle / 2;
    const shotAngle = this.angle + (Math.random() * 2 - 1) * halfAngle;
    const dmg = this.rollDamage(stats);

    state.projectiles.push(
      new Projectile({
        x: this.x,
        y: this.y,
        angle: shotAngle,
        damage: dmg,
        speed: stats.projectileSpeed,
        color: this.def.projectileColor,
        pierce: stats.pierce,
        maxRange: stats.range,
      })
    );

    if (isBonusShot) return;
    this.attackCooldown = stats.attackInterval;
    this.maybeFireBonusArrows(stats);
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

    // Attack flash: fills the whole cone/circle area, visible even with
    // no enemy in it — this is the "swing" confirmation that the tower
    // is actively attacking on cooldown, not just when something dies.
    if (!ghost) this.drawAttackFlash(drawCtx);

    drawCtx.restore();
  }

  /** @param {CanvasRenderingContext2D} drawCtx */
  drawAttackFlash(drawCtx) {
    if (this.attackFlashTimer <= 0) return;
    const alpha = this.attackFlashTimer / this.attackFlashDuration;
    const stats = this.getStats();

    if (this.isDirectional()) {
      const half = stats.coneAngle / 2;
      drawCtx.beginPath();
      drawCtx.moveTo(this.x, this.y);
      drawCtx.arc(this.x, this.y, stats.range, this.angle - half, this.angle + half);
      drawCtx.closePath();
      drawCtx.fillStyle = `rgba(255, 255, 255, ${0.5 * alpha})`;
      drawCtx.fill();
    } else if (this.def.attackType === "aoe") {
      drawCtx.beginPath();
      drawCtx.arc(this.x, this.y, stats.range, 0, Math.PI * 2);
      drawCtx.fillStyle = `rgba(255, 255, 255, ${0.4 * alpha})`;
      drawCtx.fill();
    }
  }

  /**
   * Range indicator: full circle for aoe/targeted, a facing cone wedge for
   * cone/directional towers (drawn in addition to a faint full-range circle).
   * @param {CanvasRenderingContext2D} drawCtx
   * @param {boolean} [valid=true]
   */
  drawRange(drawCtx, valid = true) {
    const stats = this.getStats();
    drawRangeCircle(drawCtx, this.x, this.y, stats.range, valid);

    if (this.isDirectional()) {
      drawConeIndicator(drawCtx, this.x, this.y, stats.range, this.angle, stats.coneAngle, valid);
      drawRotationHandle(drawCtx, this.getRotationHandlePos());
    }
  }
}