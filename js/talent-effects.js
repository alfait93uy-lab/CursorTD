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
  };

  const tree = getTree(towerId);
  if (!tree) return stats;

  let attackIntervalReduction = 0;
  let bleedDurationReduction = 0;
  let bleedLevelEntry = null;
  let critChancePoints = 0;
  let critDamagePoints = 0;

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
      }
    }
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
