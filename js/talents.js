/**
 * TALENTS.JS
 * Per-tower talent trees: a sequence of tiers, each holding a small set of
 * nodes. See CONFIG.TALENT_TREES (config.js) for the full data shape.
 *
 * Two independent gates control what's spendable:
 *   1. TIER gate — a tier unlocks once the PREVIOUS tier's total points
 *      (summed across its nodes) hits CONFIG.TALENT_TIER_UNLOCK_THRESHOLD
 *      (root uses CONFIG.TALENT_ROOT_UNLOCK_THRESHOLD instead).
 *   2. NODE gate — within an unlocked tier, a node can also require points
 *      in one specific earlier node (`requires`), and/or be mutually
 *      exclusive with sibling nodes tagged with the same `exclusiveGroup`.
 *
 * Spending here updates state.talents; actual combat-stat effects are read
 * out separately by talent-effects.js.
 */

import { CONFIG } from "./config.js";
import { state } from "./state.js";
import { updateXpUI, grantTowerUnlock, refreshTowerBar } from "./skill-tree.js";

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

/** @returns {{id:string,min:number}|null} A node's own prerequisite, if any. */
function findNode(tree, nodeId) {
  for (const tier of tree.tiers) {
    const node = tier.nodes.find((n) => n.id === nodeId);
    if (node) return node;
  }
  return null;
}

/** @returns {boolean} True if this node's own `requires` (if any) is satisfied. */
function requirementMet(towerId, tree, node) {
  if (!node.requires) return true;
  return getNodePoints(towerId, node.requires.nodeId) >= node.requires.min;
}

/** @returns {boolean} True if another node sharing this node's exclusiveGroup already has points. */
function blockedByExclusiveGroup(towerId, tree, node) {
  if (!node.exclusiveGroup) return false;
  for (const tier of tree.tiers) {
    for (const other of tier.nodes) {
      if (other.id === node.id) continue;
      if (other.exclusiveGroup !== node.exclusiveGroup) continue;
      if (getNodePoints(towerId, other.id) > 0) return true;
    }
  }
  return false;
}

/**
 * XP cost to buy this node's NEXT point (i.e. point number `currentPoints + 1`).
 * Uses `costs[currentPoints]` if the node has an escalating cost array,
 * `cost` if it has a flat one, otherwise the tree-wide default.
 */
export function getNodeCost(node, currentPoints) {
  if (node.costs) return node.costs[currentPoints] ?? node.costs[node.costs.length - 1];
  if (node.cost != null) return node.cost;
  return CONFIG.TALENT_POINT_COST;
}

/** @returns {boolean} True if this node is currently open to receive points (ignoring XP on hand). */
export function isNodeAvailable(towerId, tree, tierIndex, nodeId) {
  const tier = tree.tiers[tierIndex];
  const node = tier.nodes.find((n) => n.id === nodeId);
  if (!node) return false;
  if (!isTierUnlocked(towerId, tierIndex, tree)) return false;
  if (getNodePoints(towerId, nodeId) >= node.maxPoints) return false;
  if (!requirementMet(towerId, tree, node)) return false;
  if (blockedByExclusiveGroup(towerId, tree, node)) return false;
  return true;
}

/** @returns {boolean} True if a point can currently be spent on this node (available AND affordable). */
export function canSpendPoint(towerId, tree, tierIndex, nodeId) {
  if (!isNodeAvailable(towerId, tree, tierIndex, nodeId)) return false;

  const tier = tree.tiers[tierIndex];
  const node = tier.nodes.find((n) => n.id === nodeId);
  const points = getNodePoints(towerId, nodeId);
  const cost = getNodeCost(node, points);

  return state.player.xp >= cost;
}

/** Spend one XP-funded point on a node, if allowed. @returns {boolean} success */
export function spendPoint(towerId, tree, tierIndex, nodeId) {
  if (!canSpendPoint(towerId, tree, tierIndex, nodeId)) return false;

  const tier = tree.tiers[tierIndex];
  const node = tier.nodes.find((n) => n.id === nodeId);
  const points = getNodePoints(towerId, nodeId);
  const cost = getNodeCost(node, points);

  state.player.xp -= cost;
  const talentState = ensureTalentState(towerId);
  talentState[nodeId] = points + 1;

  if (node.unlocksTower && points === 0) {
    grantTowerUnlock(towerId);
  }
  if (node.effect && node.effect.type === "towerCap") {
    refreshTowerBar();
  }

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
      const available = unlocked && isNodeAvailable(towerId, tree, tierIndex, node.id);
      const canSpend = unlocked && canSpendPoint(towerId, tree, tierIndex, node.id);
      const cost = getNodeCost(node, points);

      const nodeEl = document.createElement("div");
      nodeEl.className = "talent-node";
      if (points >= node.maxPoints) nodeEl.classList.add("maxed");
      if (unlocked && !available && points < node.maxPoints) nodeEl.classList.add("gated");

      nodeEl.innerHTML = `
        <span class="talent-node-label">${node.label}</span>
        <span class="talent-node-points">${points}/${node.maxPoints}</span>
      `;

      if (node.desc) {
        nodeEl.title = node.desc;
      }

      // Gated hint (requires / exclusivity) shown once a tier is unlocked
      // but this particular node still isn't spendable.
      if (unlocked && !available && points < node.maxPoints) {
        const hint = document.createElement("span");
        hint.className = "talent-node-hint";
        if (node.requires) {
          const parent = findNode(tree, node.requires.nodeId);
          hint.textContent = `Requires ${node.requires.min} in ${parent ? parent.label : node.requires.nodeId}`;
        } else if (node.exclusiveGroup) {
          hint.textContent = "Locked by another choice";
        }
        nodeEl.appendChild(hint);
      }

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "talent-node-btn";
      btn.textContent = "+";
      btn.title = `${cost} XP`;
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
