/**
 * TALENTS.JS
 * Per-tower talent trees: a sequence of tiers, each either a single "gate"
 * node or a small branch of nodes. A tier unlocks the next one once its
 * unlock rule is satisfied:
 *   - { type: "sum", threshold: N }  — N points total, any combination
 *     across the tier's nodes
 *   - { type: "each", min: N }       — every node in the tier needs at
 *     least N points individually
 * A tier can also be marked `exclusive: true` (e.g. Slayer's Specials) —
 * once any node in it has a point, the others in that tier are locked out.
 *
 * All trees share the player's existing XP pool (CONFIG.TALENT_POINT_COST
 * per point). Spending here does NOT yet change any tower's actual combat
 * stats — that's a separate pass once the allocation system itself works.
 */

import { CONFIG } from "./config.js";
import { state } from "./state.js";
import { updateXpUI } from "./skill-tree.js";

/** @returns {object|null} The talent tree definition for a tower, or null if not designed yet. */
export function getTree(towerId) {
  return CONFIG.TALENT_TREES[towerId] || null;
}

function ensureTalentState(towerId) {
  if (!state.talents[towerId]) state.talents[towerId] = {};
  return state.talents[towerId];
}

export function getNodePoints(towerId, nodeId) {
  return ensureTalentState(towerId)[nodeId] || 0;
}

function getTierTotal(towerId, tier) {
  return tier.nodes.reduce((sum, n) => sum + getNodePoints(towerId, n.id), 0);
}

/** @returns {boolean} True if a tier can be spent into (its prerequisite tier's rule is met). */
export function isTierUnlocked(towerId, tierIndex, tree) {
  if (tierIndex === 0) return true;

  const prevTier = tree.tiers[tierIndex - 1];
  const rule = prevTier.unlock;
  if (!rule) return false;

  if (rule.type === "sum") {
    return getTierTotal(towerId, prevTier) >= rule.threshold;
  }
  if (rule.type === "each") {
    return prevTier.nodes.every((n) => getNodePoints(towerId, n.id) >= rule.min);
  }
  return false;
}

/** @returns {boolean} True if a point can currently be spent on this node. */
export function canSpendPoint(towerId, tree, tierIndex, nodeId) {
  const tier = tree.tiers[tierIndex];
  const node = tier.nodes.find((n) => n.id === nodeId);
  if (!node) return false;
  if (!isTierUnlocked(towerId, tierIndex, tree)) return false;

  if (getNodePoints(towerId, nodeId) >= node.maxPoints) return false;

  if (tier.exclusive) {
    const otherChosen = tier.nodes.some(
      (n) => n.id !== nodeId && getNodePoints(towerId, n.id) > 0
    );
    if (otherChosen) return false;
  }

  return state.player.xp >= CONFIG.TALENT_POINT_COST;
}

/** Spend one XP-funded point on a node, if allowed. @returns {boolean} success */
export function spendPoint(towerId, tree, tierIndex, nodeId) {
  if (!canSpendPoint(towerId, tree, tierIndex, nodeId)) return false;

  state.player.xp -= CONFIG.TALENT_POINT_COST;
  const talentState = ensureTalentState(towerId);
  talentState[nodeId] = (talentState[nodeId] || 0) + 1;
  return true;
}

/**
 * Render a tower's full talent tree into a container, tier by tier.
 * Re-renders itself (and refreshes XP displays) whenever a point is spent.
 */
export function renderTalentTree(container, towerId) {
  const tree = getTree(towerId);
  container.innerHTML = "";

  if (!tree) {
    const p = document.createElement("p");
    p.className = "talent-placeholder";
    p.textContent = "Talent tree not designed yet.";
    container.appendChild(p);
    return;
  }

  tree.tiers.forEach((tier, tierIndex) => {
    const unlocked = isTierUnlocked(towerId, tierIndex, tree);

    const tierEl = document.createElement("div");
    tierEl.className = "talent-tier" + (unlocked ? "" : " locked");

    if (!unlocked) {
      const lockMsg = document.createElement("p");
      lockMsg.className = "talent-tier-lock-msg";
      lockMsg.textContent = "Locked — invest in the tier above to unlock";
      tierEl.appendChild(lockMsg);
    }

    const nodesRow = document.createElement("div");
    nodesRow.className = "talent-nodes-row";

    for (const node of tier.nodes) {
      const points = getNodePoints(towerId, node.id);
      const canSpend = canSpendPoint(towerId, tree, tierIndex, node.id);

      const nodeEl = document.createElement("div");
      nodeEl.className = "talent-node";
      if (points >= node.maxPoints) nodeEl.classList.add("maxed");

      nodeEl.innerHTML = `
        <span class="talent-node-label">${node.label}</span>
        <span class="talent-node-points">${points}/${node.maxPoints}</span>
      `;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "talent-node-btn";
      btn.textContent = "+";
      btn.title = `${CONFIG.TALENT_POINT_COST} XP`;
      btn.disabled = !canSpend;
      btn.addEventListener("click", () => {
        if (spendPoint(towerId, tree, tierIndex, node.id)) {
          updateXpUI();
          renderTalentTree(container, towerId);
        }
      });
      nodeEl.appendChild(btn);

      nodesRow.appendChild(nodeEl);
    }

    tierEl.appendChild(nodesRow);
    container.appendChild(tierEl);
  });
}
