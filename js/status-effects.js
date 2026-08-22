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

/**
 * Apply (or refresh) a slow on an enemy. A new slow from the same source
 * REPLACES any existing slow rather than stacking (same convention as
 * bleed above). Sets enemy.speedMultiplier via updateStatusEffects, which
 * Enemy.update() applies to movement.
 * @param {import("./enemy.js").Enemy} enemy
 * @param {number} percent - 0-100, how much to slow by
 * @param {number} duration - seconds
 */
export function applySlow(enemy, percent, duration) {
  if (!enemy.statusEffects) enemy.statusEffects = [];
  enemy.statusEffects = enemy.statusEffects.filter((e) => e.type !== "slow");

  enemy.statusEffects.push({
    type: "slow",
    remaining: duration,
    multiplier: Math.max(0, 1 - percent / 100),
  });
}

/** Advance all of an enemy's active status effects by dt. Call from Enemy.update(). */
export function updateStatusEffects(enemy, dt) {
  enemy.speedMultiplier = 1;
  if (!enemy.statusEffects || enemy.statusEffects.length === 0) return;

  for (const effect of enemy.statusEffects) {
    if (effect.type === "bleed") {
      effect.tickTimer -= dt;
      while (effect.tickTimer <= 0 && effect.remainingTicks > 0) {
        if (!enemy.isAlive()) break;
        enemy.takeDamage(effect.damagePerTick);
        effect.remainingTicks--;
        effect.tickTimer += effect.tickInterval;
      }
    } else if (effect.type === "slow") {
      effect.remaining -= dt;
      if (effect.remaining > 0) enemy.speedMultiplier = effect.multiplier;
    }
    if (!enemy.isAlive()) break;
  }

  enemy.statusEffects = enemy.statusEffects.filter(
    (e) =>
      (e.type === "bleed" && e.remainingTicks > 0) ||
      (e.type === "slow" && e.remaining > 0)
  );
}
