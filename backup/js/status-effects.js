/**
 * STATUS-EFFECTS.JS
 * Timed damage-over-time (and future debuff) effects attached to enemies.
 * An enemy holds a list of active effects in `enemy.statusEffects`; each one
 * ticks independently and deals damage through Enemy.takeDamage() so kills
 * and XP still flow through the normal path.
 */

const BLEED_TICK_INTERVAL = 1; // seconds between bleed ticks

/**
 * Apply (or refresh) a bleed DoT on an enemy. A new bleed from the same
 * source REPLACES any existing bleed on that enemy rather than stacking —
 * change this if you want stacking bleeds later.
 * @param {import("./enemy.js").Enemy} enemy
 * @param {number} totalDamage - total damage dealt across the full duration
 * @param {number} duration - seconds
 */
export function applyBleed(enemy, totalDamage, duration) {
  if (!enemy.statusEffects) enemy.statusEffects = [];
  enemy.statusEffects = enemy.statusEffects.filter((e) => e.type !== "bleed");

  const ticks = Math.max(1, Math.round(duration / BLEED_TICK_INTERVAL));
  enemy.statusEffects.push({
    type: "bleed",
    remainingTicks: ticks,
    tickInterval: BLEED_TICK_INTERVAL,
    tickTimer: BLEED_TICK_INTERVAL,
    damagePerTick: totalDamage / ticks,
  });
}

/** Advance all of an enemy's active status effects by dt. Call from Enemy.update(). */
export function updateStatusEffects(enemy, dt) {
  if (!enemy.statusEffects || enemy.statusEffects.length === 0) return;

  for (const effect of enemy.statusEffects) {
    effect.tickTimer -= dt;
    while (effect.tickTimer <= 0 && effect.remainingTicks > 0) {
      if (!enemy.isAlive()) break;
      enemy.takeDamage(effect.damagePerTick);
      effect.remainingTicks--;
      effect.tickTimer += effect.tickInterval;
    }
    if (!enemy.isAlive()) break;
  }

  enemy.statusEffects = enemy.statusEffects.filter((e) => e.remainingTicks > 0);
}
