/**
 * TALENT-EFFECTS.JS
 * Turns a tower's spent talent points into its LIVE combat stats. Reads
 * CONFIG.TALENT_TREES[towerId] node definitions + how many points are spent
 * in each (state.talents), applies each spent node's `effect` descriptor,
 * and returns a flat stats object. A tower with no talent tree yet (or no
 * points spent) just gets its base CONFIG.TOWER_TYPES stats back.
 *
 * Effect descriptor types (set per-node in config.js):
 *   flatDamage              { perPoint }            damage += perPoint * points
 *   flatRange               { perPoint }            range += perPoint * points
 *   coneAngle                { perPoint }            coneAngle += perPoint * points (radians)
 *   attackInterval           { perLevelReduction[] } interval -= sum(first `points` entries)
 *   critChance               { perLevel[] }          % chance, sum of first `points` entries
 *   critDamage                { perLevel[] }          % added to CONFIG.BASE_CRIT_DAMAGE_MULTIPLIER
 *   bleed                    { levels[] }            level `points` (1-indexed) is the active {percent,duration}
 *   bleedDurationReduction   { perPoint }            shortens the active bleed's duration
 *   projectileSpeed          { perPoint }            projectileSpeed += perPoint * points
 *   damageVsTier             { tiers[], perPoint }   +perPoint*points damage multiplier vs enemies whose
 *                                                     CONFIG.ENEMY_TYPES[...].tier is in `tiers` (Marksman: Elite Damage)
 *   execute                  { tiers[], perPoint }   perPoint*points chance to instantly kill an enemy whose
 *                                                     tier is in `tiers`, rolled per hit (Marksman: Execute)
 *   bonusArrowChance         { perPoint }            perPoint*points chance to also fire extra arrow(s) at a
 *                                                     random in-range enemy, CONFIG.BONUS_ARROW_DELAY later
 *   bonusArrowCount          { perPoint }            perPoint*points extra arrows added on top of the base 1
 *                                                     whenever bonusArrowChance triggers
 *   coneAngleMultiplier      { perPoint }            coneAngle *= (1 + perPoint*points), applied after all
 *                                                     additive coneAngle nodes (Spearman: Focus Fire)
 *   periodicSlow             { interval, perLevel[] } every `interval`th connecting attack (fixed, doesn't
 *                                                     scale with rank) applies perLevel[points-1] = {percent,
 *                                                     duration} slow to every enemy hit that swing (Striker:
 *                                                     Resonant Hammer)
 *   periodicDoubleDamage     { perLevel[] }          every perLevel[points-1]th connecting attack (this
 *                                                     interval itself shortens with rank) deals double damage
 *                                                     to every enemy hit that swing (Striker: Echo Strike)
 *
 * Nodes with no `effect` field (reserved/stub nodes) are simply skipped.
 */

import { CONFIG } from "./config.js";
import { getNodePoints, getTree } from "./talents.js";

/**
 * @param {string} towerId
 * @returns {{
 *   damage: number,
 *   range: number,
 *   attackInterval: number,
 *   coneAngle: number,
 *   critChance: number,
 *   critDamageMultiplier: number,
 *   bleed: {percent:number, duration:number} | null,
 * }}
 */
export function getEffectiveTowerStats(towerId) {
  const def = CONFIG.TOWER_TYPES[towerId];

  const stats = {
    damage: def.damage,
    range: def.range,
    attackInterval: 1 / def.attackSpeed,
    coneAngle: def.coneAngle ?? 0,
    critChance: 0,
    critDamageMultiplier: CONFIG.BASE_CRIT_DAMAGE_MULTIPLIER,
    bleed: null,
    pierce: def.pierce ?? 1, // projectile-only stat; melee attack types ignore it
    maxCount: def.maxCount, // placement cap; talent-driven trees usually raise this from a 0 base
    projectileSpeed: def.projectileSpeed, // homing/line projectile speed, talent-adjustable (Marksman: Projectile Speed)
    damageVsTier: null, // { tiers:[], multiplier } | null — set by Marksman's Elite Damage
    executeChance: 0, // Marksman: Execute
    executeTiers: [],
    bonusArrowChance: 0, // Marksman: Bonus Arrow
    bonusArrowCount: 0, // Marksman: Additional Arrow Count
    resonantHammer: null, // { interval, percent, duration } | null — Striker: Resonant Hammer
    echoStrike: null, // { interval } | null — Striker: Echo Strike
  };

  const tree = getTree(towerId);
  if (!tree) return stats;

  let attackIntervalReduction = 0;
  let bleedDurationReduction = 0;
  let bleedLevelEntry = null;
  let critChancePoints = 0;
  let critDamagePoints = 0;
  let damageVsTierMultiplier = 0;
  let damageVsTierTiers = null;
  let coneAngleMultiplier = 0;

  for (const tier of tree.tiers) {
    for (const node of tier.nodes) {
      const points = getNodePoints(towerId, node.id);
      if (points <= 0 || !node.effect) continue;
      const eff = node.effect;

      switch (eff.type) {
        case "flatDamage":
          stats.damage += eff.perPoint * points;
          break;
        case "flatRange":
          stats.range += eff.perPoint * points;
          break;
        case "coneAngle":
          stats.coneAngle = Math.min(Math.PI * 2, stats.coneAngle + eff.perPoint * points);
          break;
        case "attackInterval":
          attackIntervalReduction += eff.perLevelReduction
            .slice(0, points)
            .reduce((sum, v) => sum + v, 0);
          break;
        case "critChance":
          critChancePoints += eff.perLevel.slice(0, points).reduce((sum, v) => sum + v, 0);
          break;
        case "critDamage":
          critDamagePoints += eff.perLevel.slice(0, points).reduce((sum, v) => sum + v, 0);
          break;
        case "bleed":
          bleedLevelEntry = eff.levels[points - 1];
          break;
        case "bleedDurationReduction":
          bleedDurationReduction += eff.perPoint * points;
          break;
        case "towerCap":
          stats.maxCount += eff.perPoint * points;
          break;
        case "projectileSpeed":
          stats.projectileSpeed += eff.perPoint * points;
          break;
        case "damageVsTier":
          damageVsTierMultiplier += eff.perPoint * points;
          damageVsTierTiers = eff.tiers;
          break;
        case "execute":
          stats.executeChance = Math.min(1, stats.executeChance + eff.perPoint * points);
          stats.executeTiers = eff.tiers;
          break;
        case "bonusArrowChance":
          stats.bonusArrowChance = Math.min(1, stats.bonusArrowChance + eff.perPoint * points);
          break;
        case "bonusArrowCount":
          stats.bonusArrowCount += eff.perPoint * points;
          break;
        case "coneAngleMultiplier":
          coneAngleMultiplier += eff.perPoint * points;
          break;
        case "periodicSlow":
          if (points > 0) {
            const level = eff.perLevel[points - 1];
            stats.resonantHammer = { interval: eff.interval, percent: level.percent, duration: level.duration };
          }
          break;
        case "periodicDoubleDamage":
          if (points > 0) {
            stats.echoStrike = { interval: eff.perLevel[points - 1] };
          }
          break;
      }
    }
  }

  if (damageVsTierTiers) {
    stats.damageVsTier = { tiers: damageVsTierTiers, multiplier: 1 + damageVsTierMultiplier };
  }

  if (coneAngleMultiplier !== 0) {
    stats.coneAngle = Math.max(0, stats.coneAngle * (1 + coneAngleMultiplier));
  }

  stats.critChance = Math.min(1, critChancePoints / 100);
  stats.critDamageMultiplier += critDamagePoints / 100;
  stats.attackInterval = Math.max(
    CONFIG.MIN_ATTACK_INTERVAL,
    stats.attackInterval - attackIntervalReduction
  );

  if (bleedLevelEntry) {
    const duration = Math.max(CONFIG.MIN_BLEED_DURATION, bleedLevelEntry.duration - bleedDurationReduction);
    stats.bleed = { percent: bleedLevelEntry.percent, duration };
  }

  return stats;
}
