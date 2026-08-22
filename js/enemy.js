/**
 * ENEMY.JS
 * Enemy that walks a precomputed path (from pathfinding.js) toward the Fort.
 */

import { CONFIG } from "./config.js";
import { state } from "./state.js";
import { tileToWorldCenter } from "./coords.js";
import { awardXp, getEnemyXpReward } from "./skill-tree.js";
import { damageFort } from "./fort.js";
import { updateStatusEffects } from "./status-effects.js";

export class Enemy {
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
    this.fortDamage = typeDef.fortDamage;
    this.dead = false;
    this.reachedFort = false;
    this.speedMultiplier = 1; // set each frame by updateStatusEffects (e.g. a Resonant Hammer slow)

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

    updateStatusEffects(this, dt);
    if (!this.isAlive()) return; // a bleed tick may have just killed it

    const target = this.getTargetPosition();
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 2) {
      if (this.waypointIndex >= this.path.length - 1) {
        this.x = target.x;
        this.y = target.y;
        this.reachedFort = true;
        // Hit the Fort once, then remove this enemy (no XP — it wasn't killed).
        damageFort(this.fortDamage);
        this.dead = true;
        return;
      }
      this.waypointIndex++;
      return this.update(dt);
    }

    const step = Math.min(this.speed * this.speedMultiplier * dt, distance);
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
