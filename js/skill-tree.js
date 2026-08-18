/**
 * SKILL-TREE.JS
 * XP tracking and the skill tree overlay that unlocks tower types.
 */

import { CONFIG } from "./config.js";
import { state } from "./state.js";
import { renderTowerBar } from "./placement.js";
import { cancelTowerInteraction } from "./input.js";

/** @returns {number} XP reward for killing an enemy type. */
export function getEnemyXpReward(typeId) {
  return CONFIG.ENEMY_TYPES[typeId]?.xpReward ?? 5;
}

/** Add XP and refresh UI. */
export function awardXp(amount) {
  if (amount <= 0) return;
  state.player.xp += amount;
  updateXpUI();
}

/** @returns {boolean} True if the player has unlocked this tower type. */
export function isTowerUnlocked(typeId) {
  return state.player.unlockedTowers.has(typeId);
}

/** Update XP display in the HUD and skill tree panel. */
export function updateXpUI() {
  const text = `XP: ${state.player.xp}`;
  document.getElementById("xp-display").textContent = text;
  document.getElementById("skill-tree-xp").textContent = text;
}

/** @returns {boolean} True if the skill tree overlay is open. */
export function isSkillTreeOpen() {
  return state.ui.skillTreeOpen;
}

export function openSkillTree() {
  state.ui.skillTreeOpen = true;
  const panel = document.getElementById("skill-tree-panel");
  panel.classList.remove("hidden");
  panel.setAttribute("aria-hidden", "false");
  cancelTowerInteraction();
  renderSkillTreeNodes();
  updateXpUI();
}

export function closeSkillTree() {
  state.ui.skillTreeOpen = false;
  const panel = document.getElementById("skill-tree-panel");
  panel.classList.add("hidden");
  panel.setAttribute("aria-hidden", "true");
}

export function toggleSkillTree() {
  if (isSkillTreeOpen()) closeSkillTree();
  else openSkillTree();
}

/** Render skill tree node buttons based on unlock state. */
export function renderSkillTreeNodes() {
  const container = document.getElementById("skill-tree-nodes");
  container.innerHTML = "";

  for (const node of CONFIG.SKILL_TREE) {
    const towerDef = CONFIG.TOWER_TYPES[node.towerType];
    const unlocked = isTowerUnlocked(node.towerType);
    const canAfford = state.player.xp >= node.cost;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "skill-node";
    btn.dataset.nodeId = node.id;

    if (unlocked) {
      btn.classList.add("unlocked");
      btn.disabled = true;
      btn.innerHTML = `
        <span class="skill-node-icon tower-icon-${node.towerType}"></span>
        <span class="skill-node-name">${node.label}</span>
        <span class="skill-node-status">Unlocked</span>
      `;
    } else {
      btn.disabled = !canAfford;
      btn.innerHTML = `
        <span class="skill-node-icon tower-icon-${node.towerType}"></span>
        <span class="skill-node-name">${node.label}</span>
        <span class="skill-node-cost">${node.cost} XP</span>
      `;
      btn.addEventListener("click", () => tryUnlockSkill(node.id));
    }

    if (towerDef) {
      btn.title = `${node.label} — ${towerDef.damage} dmg, ${towerDef.range}px range`;
    }

    container.appendChild(btn);
  }
}

/**
 * Attempt to unlock a skill tree node.
 * @param {string} nodeId
 * @returns {boolean}
 */
export function tryUnlockSkill(nodeId) {
  const node = CONFIG.SKILL_TREE.find((n) => n.id === nodeId);
  if (!node) return false;
  if (isTowerUnlocked(node.towerType)) return false;
  if (state.player.xp < node.cost) return false;

  state.player.xp -= node.cost;
  state.player.unlockedTowers.add(node.towerType);

  renderSkillTreeNodes();
  renderTowerBar();
  updateXpUI();

  console.log(`Unlocked tower: ${node.label}`);
  return true;
}
