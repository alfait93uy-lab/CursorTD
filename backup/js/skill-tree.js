/**
 * SKILL-TREE.JS
 * XP tracking, and the Skill Tree panel: a tab per tower. Each tab shows
 * that tower's base unlock (10 XP, existing mechanic) and, once unlocked,
 * its deeper talent tree (see talents.js).
 */

import { CONFIG } from "./config.js";
import { state } from "./state.js";
import { renderTowerBar } from "./placement.js";
import { cancelTowerInteraction } from "./input.js";
import { renderTalentTree, getTree } from "./talents.js";

/** @returns {number} XP reward for killing an enemy type. */
export function getEnemyXpReward(typeId) {
  return CONFIG.ENEMY_TYPES[typeId]?.xpReward ?? 5;
}

/** Add XP and refresh UI. */
export function awardXp(amount) {
  if (amount <= 0) return;
  state.player.xp += amount;
  if (state.wave.active) state.wave.xpEarnedThisWave += amount;
  updateXpUI();
}

/** @returns {boolean} True if the player has unlocked this tower type. */
export function isTowerUnlocked(typeId) {
  return state.player.unlockedTowers.has(typeId);
}

/**
 * Grant a tower unlock directly (no XP cost — the caller already paid, e.g.
 * a talent tree's root node). Idempotent. Used by talents.js when a node
 * flagged `unlocksTower` receives its first point.
 */
export function grantTowerUnlock(towerId) {
  if (isTowerUnlocked(towerId)) return;
  state.player.unlockedTowers.add(towerId);
  renderTowerBar();
}

/** Re-render the tower bar (counts/caps can change on any talent spend, not just unlock). */
export function refreshTowerBar() {
  renderTowerBar();
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
  renderSkillTreeTabs();
  renderSkillTreeTabContent();
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

/** Render the tower tab buttons (Slayer / Spearman / Striker / Marksman). */
function renderSkillTreeTabs() {
  const container = document.getElementById("skill-tree-tabs");
  container.innerHTML = "";

  for (const node of CONFIG.SKILL_TREE) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "skill-tab";
    btn.textContent = node.label;
    btn.classList.toggle("active", node.towerType === state.ui.skillTreeTab);
    btn.addEventListener("click", () => {
      state.ui.skillTreeTab = node.towerType;
      renderSkillTreeTabs();
      renderSkillTreeTabContent();
    });
    container.appendChild(btn);
  }
}

/** Render the active tab: unlock section, then talent tree (if unlocked). */
function renderSkillTreeTabContent() {
  const towerId = state.ui.skillTreeTab;
  const container = document.getElementById("skill-tree-tab-content");
  container.innerHTML = "";

  const node = CONFIG.SKILL_TREE.find((n) => n.towerType === towerId);
  const towerDef = CONFIG.TOWER_TYPES[towerId];
  const unlocked = isTowerUnlocked(towerId);
  const tree = getTree(towerId);

  // --- Unlock section ---
  // Towers with a talent tree unlock via that tree's Root node (its first
  // point IS the unlock) — no separate purchase here. Towers without a tree
  // yet still use the old standalone unlock button.
  if (!tree) {
    const unlockSection = document.createElement("div");
    unlockSection.className = "skill-unlock-section";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "skill-node";

    if (unlocked) {
      btn.classList.add("unlocked");
      btn.disabled = true;
      btn.innerHTML = `
        <span class="skill-node-icon tower-icon-${towerId}"></span>
        <span class="skill-node-name">${node.label}</span>
        <span class="skill-node-status">Unlocked</span>
      `;
    } else {
      btn.disabled = state.player.xp < node.cost;
      btn.innerHTML = `
        <span class="skill-node-icon tower-icon-${towerId}"></span>
        <span class="skill-node-name">${node.label}</span>
        <span class="skill-node-cost">${node.cost} XP</span>
      `;
      btn.addEventListener("click", () => tryUnlockSkill(node.id));
    }

    if (towerDef) {
      btn.title = `${node.label} — ${towerDef.damage} dmg, ${towerDef.range}px range`;
    }

    unlockSection.appendChild(btn);
    container.appendChild(unlockSection);
  }

  // --- Talent tree section ---
  // With a tree: always shown (Root tier handles its own unlock/gating).
  // Without one: only a placeholder, gated behind the old unlock button.
  const treeSection = document.createElement("div");
  treeSection.className = "talent-tree-section";

  if (tree) {
    renderTalentTree(treeSection, towerId);
  } else if (!unlocked) {
    const msg = document.createElement("p");
    msg.className = "talent-placeholder";
    msg.textContent = "Unlock this tower to access its talent tree.";
    treeSection.appendChild(msg);
  } else {
    renderTalentTree(treeSection, towerId);
  }

  container.appendChild(treeSection);
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

  renderSkillTreeTabContent();
  renderTowerBar();
  updateXpUI();

  console.log(`Unlocked tower: ${node.label}`);
  return true;
}
