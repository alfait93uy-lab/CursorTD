/**
 * PROJECTILE.JS
 * Two firing modes, one class:
 *   - HOMING (pass `target`): steers toward one enemy every frame — the
 *     existing Marksman shot.
 *   - LINE (pass `angle` instead): flies straight in a fixed direction from
 *     spawn, checking every enemy in its path each frame — the Spearman
 *     directional-projectile shot.
 * Both support PIERCE: a projectile can hit more than one enemy before
 * dying. A homing shot pierces by switching to line mode (continuing
 * straight in its current direction) once its original target is hit.
 * `pierce: Infinity` hits everything in its path until it leaves `maxRange`.
 */

import { state } from "./state.js";

export class Projectile {
  /**
   * @param {object} opts
   * @param {number} opts.x
   * @param {number} opts.y
   * @param {number} opts.damage
   * @param {number} opts.speed
   * @param {string} opts.color
   * @param {Enemy} [opts.target] - Homing mode: locks onto and steers toward this enemy.
   * @param {number} [opts.angle] - Line mode: fixed direction in radians (ignored if `target` is set).
   * @param {number} [opts.pierce=1] - Enemies this can hit before dying. Infinity = unlimited (until maxRange).
   * @param {number} [opts.maxRange=Infinity] - Max travel distance from spawn (applies once in line mode).
   */
  constructor({ x, y, damage, speed, color, target = null, angle = null, pierce = 1, maxRange = Infinity }) {
    this.x = x;
    this.y = y;
    this.originX = x;
    this.originY = y;
    this.damage = damage;
    this.speed = speed;
    this.color = color;
    this.radius = 7;
    this.alive = true;

    this.target = target; // homing lock; null = line mode (either from the start, or handed off after a homing hit)
    this.dirX = target ? 0 : Math.cos(angle);
    this.dirY = target ? 0 : Math.sin(angle);

    this.pierce = pierce;
    this.maxRange = maxRange;
    this.hitEnemies = new Set(); // enemies already hit by THIS projectile — never hit the same one twice
  }

  /** Deal damage, consume one pierce charge. @returns {boolean} true if the projectile should die now. */
  registerHit(enemy) {
    enemy.takeDamage(this.damage);
    this.hitEnemies.add(enemy);
    this.pierce -= 1;
    return this.pierce <= 0;
  }

  /** @param {number} dt */
  update(dt) {
    if (!this.alive) return;
    if (this.target) this.updateHoming(dt);
    else this.updateLine(dt);
  }

  updateHoming(dt) {
    if (!this.target.isAlive()) {
      // Original target died before impact — hand off to line mode using
      // whatever direction we last had. If we never moved (dirX/Y still
      // 0,0 — spawned this same frame), there's nothing to continue with.
      this.target = null;
      if (this.dirX === 0 && this.dirY === 0) {
        this.alive = false;
        return;
      }
      this.updateLine(dt);
      return;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const hitDist = this.target.radius + this.radius;

    if (dist <= hitDist) {
      const dead = this.registerHit(this.target);
      this.target = null; // hand off to line mode for any remaining pierce
      if (dead) this.alive = false;
      return;
    }

    this.dirX = dx / dist;
    this.dirY = dy / dist;
    const step = this.speed * dt;
    this.x += this.dirX * step;
    this.y += this.dirY * step;
  }

  updateLine(dt) {
    // Check the current position first (consistent with homing's
    // check-before-move), so a projectile that just arrived here — e.g.
    // handed off from homing — can still hit something standing right on it.
    for (const enemy of state.enemies) {
      if (!enemy.isAlive() || this.hitEnemies.has(enemy)) continue;
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist <= enemy.radius + this.radius) {
        const dead = this.registerHit(enemy);
        if (dead) {
          this.alive = false;
          return;
        }
      }
    }

    const step = this.speed * dt;
    this.x += this.dirX * step;
    this.y += this.dirY * step;

    if (Math.hypot(this.x - this.originX, this.y - this.originY) >= this.maxRange) {
      this.alive = false;
    }
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
