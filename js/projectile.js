/**
 * PROJECTILE.JS
 * Simple homing projectile fired by ranged towers (currently just Marksman).
 */

import { state } from "./state.js";

export class Projectile {
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
